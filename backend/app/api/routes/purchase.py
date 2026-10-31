import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.database import repositories as repo
from app.models.decision import Decision
from app.schemas.schemas import PolicyRules, PurchaseRequestIn
from app.services import audit_service, paypal_service, policy_engine, risk_engine
from app.services.paypal_service import PayPalConfigError, PayPalService
from app.services.policy_engine import SpendContext

router = APIRouter()

_DEFAULT_RULES = PolicyRules(auto_purchase_limit=500)

# PayPal order states that mean "the payer has committed to pay".
_PAYER_APPROVED_STATES = {"APPROVED", "COMPLETED"}


async def _active_rules() -> PolicyRules:
    policy = await repo.find_one("policies", {"status": "ACTIVE"})
    if not policy:
        return _DEFAULT_RULES
    try:
        stored = policy.get("rules") or {}
        return PolicyRules(
            auto_purchase_limit=stored.get("autoPurchaseLimit"),
            # These two were previously unreachable: the engine understood them
            # but nothing ever populated them from a stored policy.
            daily_spend_limit=stored.get("dailySpendLimit"),
            monthly_spend_limit=stored.get("monthlySubscriptionLimit"),
            blocked_merchants=stored.get("blockedMerchants") or [],
            trusted_merchants=stored.get("allowedMerchants") or [],
            require_review_above=stored.get("requireApprovalAbove"),
            block_unapproved_merchants=bool(stored.get("blockUnapprovedMerchants")),
        )
    except Exception:
        return _DEFAULT_RULES


async def _completed_spend_context() -> SpendContext:
    """Rolling COMPLETED-payment totals used by the deterministic spend limits.

    Only captured PayPal payments count. A CREATED order, a blocked request or a
    failed attempt contributes nothing, so a limit can never be tripped by money
    that never moved.
    """
    now = datetime.now(timezone.utc)
    daily = await repo.completed_spend_since("payments", (now - timedelta(hours=24)).isoformat())
    monthly = await repo.completed_spend_since("payments", (now - timedelta(days=30)).isoformat())
    return SpendContext(daily_completed=daily, monthly_completed=monthly)


@router.post("/purchase/request")
async def create_purchase_request(body: PurchaseRequestIn):
    # Idempotency: a replayed submission (double-click, retry, network replay)
    # returns the original decision instead of recording a second request.
    # The deterministic engine is not re-run, so the same logical submission can
    # never yield two records or two different decisions.
    if body.client_request_id:
        existing = await repo.find_one("purchase_requests", {"client_request_id": body.client_request_id})
        if existing:
            await audit_service.record(
                "duplicate_purchase_request_prevented",
                {"client_request_id": body.client_request_id, "request_id": existing.get("id")},
            )
            return {**existing, "idempotent_replay": True}

    rules = await _active_rules()
    spend = await _completed_spend_context()
    # Deterministic code decides. The LLM is never consulted for this call.
    decision, reason = policy_engine.evaluate(body.amount, body.merchant, rules, spend)
    risk = await risk_engine.analyze(body.merchant, body.amount, body.currency)
    rid = uuid.uuid4().hex[:8].upper()
    record = {
        "id": rid, "merchant": body.merchant, "amount": body.amount, "currency": body.currency,
        "item_summary": body.item_summary, "description": body.description,
        "client_request_id": body.client_request_id,
        "decision": decision.value, "reason": reason, "risk": risk,
        "spend_context": {
            "completed_24h": round(spend.daily_completed, 2),
            "completed_30d": round(spend.monthly_completed, 2),
        },
    }
    await repo.insert("purchase_requests", record)
    await repo.insert("risk_decisions", {"request_id": rid, **risk})
    if decision is Decision.REVIEW_REQUIRED:
        await repo.insert("approvals", {"request_id": rid, "status": "PENDING"})
    await repo.insert("spending_history", {"merchant": body.merchant, "amount": body.amount, "decision": decision.value})
    await audit_service.record("purchase_request_received", {"request_id": rid, "merchant": body.merchant, "amount": body.amount, "currency": body.currency})
    await audit_service.record("policy_evaluated", {"request_id": rid, "decision": decision.value, "reason": reason})
    await audit_service.record("risk_analysis_completed", {"request_id": rid, "risk_level": risk.get("risk_level")})
    if decision is Decision.BLOCKED:
        await audit_service.record("payment_blocked", {"request_id": rid, "note": "No PayPal order created"})
    elif decision is Decision.REVIEW_REQUIRED:
        await audit_service.record("human_approval_requested", {"request_id": rid})
    return record


@router.get("/purchase/requests")
async def list_purchase_requests(decision: str | None = None):
    query = {"decision": decision} if decision else {}
    items = await repo.find("purchase_requests", query)
    return {"requests": items, "db_configured": repo.mongo_configured()}


@router.get("/purchase/{request_id}")
async def get_purchase(request_id: str):
    doc = await repo.find_one("purchase_requests", {"id": request_id.upper()})
    return doc or {"error": "not_found"}


@router.post("/purchase/{request_id}/approve")
async def approve_purchase(request_id: str):
    rec = await repo.find_one("purchase_requests", {"id": request_id.upper()})
    if not rec:
        return {"error": "not_found"}
    if rec["decision"] == Decision.BLOCKED.value:
        return {"error": "blocked_transactions_cannot_be_approved"}

    await repo.update("purchase_requests", {"id": rec["id"]}, {"decision": Decision.APPROVED.value})
    await repo.update("approvals", {"request_id": rec["id"]}, {"status": "APPROVED"})
    await audit_service.record("human_approval", {"request_id": rec["id"]})

    # Idempotent approval: the same purchase request must never create a
    # second PayPal order (protects double-clicks, retries, network replays).
    existing_payment = await repo.find_one("payments", {"request_id": rec["id"]})
    if existing_payment and existing_payment.get("paypal_order_id"):
        await audit_service.record(
            "duplicate_approval_prevented",
            {"request_id": rec["id"], "paypal_order_id": existing_payment["paypal_order_id"]},
        )
        # Reuse the stored approval URL so CONTINUE WITH PAYPAL still works
        # after a page refresh instead of only on the first response.
        return {
            "request_id": rec["id"],
            "decision": Decision.APPROVED.value,
            "paypal": {
                "id": existing_payment["paypal_order_id"],
                "status": existing_payment.get("status", "CREATED"),
                "approve_url": existing_payment.get("approve_url"),
                "idempotent_replay": True,
            },
        }

    try:
        order = await PayPalService().create_order(
            rec["amount"], rec["currency"], rec["id"],
            idempotency_key=f"payguard-order-{rec['id']}",
        )
    except PayPalConfigError as exc:
        await repo.insert("payments", {
            "request_id": rec["id"], "merchant": rec["merchant"], "amount": rec["amount"],
            "currency": rec["currency"], "status": "PAYPAL_NOT_CONFIGURED", "paypal_order_id": None,
        })
        await audit_service.record("paypal_not_configured", {"request_id": rec["id"], "detail": str(exc)})
        return {
            "request_id": rec["id"], "decision": Decision.APPROVED.value,
            "paypal": {"status": "NOT_CONFIGURED", "detail": "PayPal Sandbox credentials are not configured."},
        }
    except Exception as exc:
        await audit_service.record("paypal_order_failed", {"request_id": rec["id"], "detail": str(exc)[:200]})
        return {"request_id": rec["id"], "decision": Decision.APPROVED.value, "paypal": {"status": "ERROR", "detail": str(exc)[:200]}}

    # Persist the real HATEOAS approval URL. Without it the payer can never move
    # the order out of PAYER_ACTION_REQUIRED and capture is impossible.
    approve_url = PayPalService.approval_url(order)
    await repo.insert("payments", {
        "request_id": rec["id"], "merchant": rec["merchant"], "amount": rec["amount"], "currency": rec["currency"],
        "status": order.get("status", "CREATED"), "paypal_order_id": order.get("id"),
        "approve_url": approve_url,
    })
    await audit_service.record(
        "paypal_order_created",
        {"request_id": rec["id"], "paypal_order_id": order.get("id"), "approve_url_present": bool(approve_url)},
    )
    return {
        "request_id": rec["id"],
        "decision": Decision.APPROVED.value,
        "paypal": {**order, "approve_url": approve_url},
    }


# --------------------------------------------------------------------------
# Ownership guard shared by capture / return / cancel.
# A frontend-supplied order id is never trusted on its own.
# --------------------------------------------------------------------------
async def _resolve_owned_payment(order_id: str):
    payment = await repo.find_one("payments", {"paypal_order_id": order_id})
    if not payment:
        return None, None, JSONResponse(
            status_code=404,
            content={
                "status": "NOT_FOUND",
                "detail": "No PayGuard payment is associated with this PayPal order ID. PayPal was not called.",
            },
        )
    if payment.get("paypal_order_id") != order_id:
        return None, None, JSONResponse(
            status_code=400,
            content={"status": "MISMATCH", "detail": "PayPal order ID does not match the stored PayGuard payment."},
        )

    request_rec = await repo.find_one("purchase_requests", {"id": payment.get("request_id")})
    if not request_rec:
        return None, None, JSONResponse(
            status_code=404,
            content={
                "status": "NOT_FOUND",
                "detail": "The PayGuard purchase request for this payment was not found. PayPal was not called.",
            },
        )
    # BLOCKED and REVIEW_REQUIRED can never reach PayPal. This is the single
    # authorisation gate shared by every money-moving endpoint.
    if request_rec.get("decision") != Decision.APPROVED.value:
        return None, None, JSONResponse(
            status_code=403,
            content={
                "status": "FORBIDDEN",
                "detail": (
                    f"Purchase request is {request_rec.get('decision')}, not APPROVED. "
                    "Human authorization is required before capture. PayPal was not called."
                ),
                "request_id": request_rec.get("id"),
                "decision": request_rec.get("decision"),
            },
        )
    return payment, request_rec, None


def _capture_summary(result: dict, payment: dict, request_rec: dict) -> dict:
    """Pull the real capture facts out of PayPal's capture response."""
    capture_id = None
    amount = None
    currency = payment.get("currency")
    for unit in result.get("purchase_units") or []:
        for cap in ((unit.get("payments") or {}).get("captures") or []):
            capture_id = capture_id or cap.get("id")
            amt = cap.get("amount") or {}
            amount = amt.get("value", amount)
            currency = amt.get("currency_code", currency)
    return {
        "status": result.get("status"),
        "capture_id": capture_id,
        "amount": amount,
        "currency": currency,
        "paypal_order_id": result.get("id") or payment.get("paypal_order_id"),
        "request_id": request_rec.get("id"),
        "merchant": payment.get("merchant"),
    }


async def _persist_capture_truth(order_id: str, body: dict, payment: dict) -> None:
    """Write PayPal's confirmed capture facts into the payment record.

    Every path that learns "this order is COMPLETED at PayPal" must persist the
    capture id too. Recording only the status would leave the authoritative
    MongoDB record claiming a completed payment with no way to prove it.
    """
    update = {"status": "COMPLETED"}
    if body.get("capture_id"):
        update["capture_id"] = body["capture_id"]
    if body.get("amount"):
        update["captured_amount"] = body["amount"]
    if body.get("currency"):
        update["currency"] = body["currency"]
    update["captured_at"] = payment.get("captured_at") or datetime.now(timezone.utc).isoformat()
    await repo.update("payments", {"paypal_order_id": order_id}, update)


async def _capture_for(payment: dict, request_rec: dict, order_id: str, trigger: str) -> tuple[dict, int]:
    """Capture with the existing idempotency key and record truthful state.

    Returns (body, http_status). Assumes ownership + APPROVED already verified.
    """
    try:
        result = await PayPalService().capture_order(order_id, idempotency_key=f"payguard-capture-{order_id}")
    except PayPalConfigError:
        await audit_service.record("paypal_not_configured", {"paypal_order_id": order_id, "trigger": trigger})
        return {"status": "NOT_CONFIGURED", "detail": "PayPal Sandbox credentials are not configured."}, 200
    except Exception as exc:
        await audit_service.record("paypal_capture_failed", {"paypal_order_id": order_id, "trigger": trigger, "detail": str(exc)[:200]})
        return {"status": "ERROR", "detail": str(exc)[:300]}, 200

    summary = _capture_summary(result, payment, request_rec)
    await repo.update(
        "payments",
        {"paypal_order_id": order_id},
        {
            "status": result.get("status", "COMPLETED"),
            "capture_id": summary["capture_id"],
            "captured_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    await audit_service.record(
        "paypal_capture_completed",
        {"paypal_order_id": order_id, "capture_id": summary["capture_id"],
         "amount": summary["amount"], "currency": summary["currency"], "trigger": trigger},
    )
    return summary, 200


@router.get("/payments/{order_id}/status")
async def payment_status(order_id: str):
    """Read-only: what does PayPal itself say about this order?

    Never captures. Used by the UI to show truthful state without moving money.
    """
    payment, request_rec, err = await _resolve_owned_payment(order_id)
    if err:
        return err
    local = {
        "paypal_order_id": order_id,
        "request_id": request_rec.get("id"),
        "merchant": payment.get("merchant"),
        "amount": payment.get("amount"),
        "currency": payment.get("currency"),
        "local_status": payment.get("status"),
        "capture_id": payment.get("capture_id"),
        "approve_url": payment.get("approve_url"),
    }
    try:
        remote = await PayPalService().get_order(order_id)
    except PayPalConfigError:
        return {**local, "paypal_status": None, "status": "NOT_CONFIGURED"}
    except Exception as exc:
        return {**local, "paypal_status": None, "status": "ERROR", "detail": str(exc)[:300]}
    return {**local, "paypal_status": remote.get("status"), "status": remote.get("status")}


@router.get("/payments/{order_id}/return")
async def payment_return(order_id: str):
    """PayPal success-redirect handler: verify, then capture exactly once.

    Trust chain: the order id from the browser is only a lookup key. Ownership in
    PayGuard's own payments collection, the linked purchase request and its
    APPROVED decision are all re-verified, and the authoritative payer-approval
    state is read from PayPal. Capture happens only when PayPal says the payer
    really approved. Refreshing this URL never captures twice.
    """
    payment, request_rec, err = await _resolve_owned_payment(order_id)
    if err:
        return err

    service = PayPalService()
    try:
        remote = await service.get_order(order_id)
    except PayPalConfigError:
        await audit_service.record("paypal_not_configured", {"paypal_order_id": order_id, "trigger": "return"})
        return {"status": "NOT_CONFIGURED", "detail": "PayPal Sandbox credentials are not configured."}
    except Exception as exc:
        await audit_service.record("paypal_order_lookup_failed", {"paypal_order_id": order_id, "detail": str(exc)[:200]})
        return {"status": "ERROR", "detail": str(exc)[:300]}

    paypal_status = remote.get("status")

    # Already captured at PayPal: reconcile local truth, never capture again.
    if paypal_status == "COMPLETED":
        already = payment.get("status") == "COMPLETED"
        body = _capture_summary(remote, payment, request_rec)
        await _persist_capture_truth(order_id, body, payment)
        body["idempotent_replay"] = True
        body["detail"] = "Payment already completed at PayPal. No second capture attempted."
        await audit_service.record(
            "paypal_capture_completed" if not already else "paypal_capture_replay",
            {"paypal_order_id": order_id, "capture_id": body.get("capture_id"), "reconciled": not already},
        )
        return body

    # Payer has not approved. Never capture, never claim success.
    if paypal_status not in _PAYER_APPROVED_STATES:
        await audit_service.record(
            "paypal_buyer_not_approved",
            {"paypal_order_id": order_id, "paypal_status": paypal_status, "trigger": "return"},
        )
        return {
            "status": "NOT_APPROVED",
            "paypal_status": paypal_status,
            "paypal_order_id": order_id,
            "request_id": request_rec.get("id"),
            "detail": (
                f"PayPal reports the order is {paypal_status}, not approved by the payer. "
                "No capture was attempted. Use CONTINUE WITH PAYPAL to approve it."
            ),
        }

    # Payer approved (APPROVED) -> this is the only legitimate capture trigger.
    await audit_service.record(
        "paypal_buyer_approved",
        {"paypal_order_id": order_id, "request_id": request_rec.get("id"), "paypal_status": paypal_status},
    )
    body, status = await _capture_for(payment, request_rec, order_id, trigger="return")
    return JSONResponse(status_code=status, content=body)


@router.post("/payments/{order_id}/cancel")
async def payment_cancel(order_id: str):
    """PayPal cancel-redirect handler. Never captures, never marks COMPLETED."""
    payment, request_rec, err = await _resolve_owned_payment(order_id)
    if err:
        return err

    paypal_status = None
    remote: dict = {}
    try:
        remote = await PayPalService().get_order(order_id)
        paypal_status = remote.get("status")
    except Exception:
        # A failed lookup must not turn a cancel into a success or a crash.
        paypal_status = None

    # If PayPal already captured it, the cancel redirect lost a race with a
    # successful payment. Report the real state instead of pretending it failed.
    if paypal_status == "COMPLETED":
        body = _capture_summary(remote, payment, request_rec)
        await _persist_capture_truth(order_id, body, payment)
        await audit_service.record("paypal_capture_replay", {"paypal_order_id": order_id, "note": "cancel redirect received after capture"})
        return {
            "status": "COMPLETED",
            "paypal_order_id": order_id,
            "request_id": request_rec.get("id"),
            "capture_id": body.get("capture_id"),
            "amount": body.get("amount"),
            "currency": body.get("currency"),
            "detail": "PayPal reports this order is already COMPLETED. The payment was captured.",
        }

    if payment.get("status") != "COMPLETED":
        await repo.update("payments", {"paypal_order_id": order_id}, {"status": "CANCELLED"})
    await audit_service.record(
        "paypal_payment_cancelled",
        {"paypal_order_id": order_id, "request_id": request_rec.get("id"),
         "paypal_status": paypal_status, "note": "Payer cancelled at PayPal. No capture attempted."},
    )
    return {
        "status": "CANCELLED",
        "paypal_order_id": order_id,
        "request_id": request_rec.get("id"),
        "paypal_status": paypal_status,
        "detail": "Payment was cancelled at PayPal. No money moved and no capture was attempted.",
    }


@router.post("/payments/{order_id}/capture")
async def capture_payment(order_id: str):
    # Ownership validation: a capture is only ever performed for a PayPal order
    # that PayGuard itself created, for a purchase request that was approved.
    payment, request_rec, err = await _resolve_owned_payment(order_id)
    if err:
        return err

    # Local short-circuit first: a payment already recorded COMPLETED must never
    # reach PayPal again.
    if payment.get("status") == "COMPLETED":
        return {
            "request_id": payment.get("request_id"),
            "paypal_order_id": order_id,
            "status": "COMPLETED",
            "capture_id": payment.get("capture_id"),
            "idempotent_replay": True,
            "detail": "Payment already captured. No second capture attempted.",
        }

    # The browser is never trusted about payer approval. Ask PayPal.
    try:
        remote = await PayPalService().get_order(order_id)
    except PayPalConfigError:
        return {"status": "NOT_CONFIGURED", "detail": "PayPal Sandbox credentials are not configured."}
    except Exception as exc:
        await audit_service.record("paypal_order_lookup_failed", {"paypal_order_id": order_id, "detail": str(exc)[:200]})
        return {"status": "ERROR", "detail": str(exc)[:300]}

    paypal_status = remote.get("status")
    if paypal_status == "COMPLETED":
        body = _capture_summary(remote, payment, request_rec)
        await _persist_capture_truth(order_id, body, payment)
        await audit_service.record("paypal_capture_replay", {"paypal_order_id": order_id, "reconciled": True})
        return {**body, "idempotent_replay": True,
                "detail": "Payment already completed at PayPal. No second capture attempted."}
    if paypal_status not in _PAYER_APPROVED_STATES:
        await audit_service.record(
            "paypal_buyer_not_approved",
            {"paypal_order_id": order_id, "paypal_status": paypal_status, "trigger": "capture"},
        )
        return {
            "status": "NOT_APPROVED",
            "paypal_status": paypal_status,
            "paypal_order_id": order_id,
            "request_id": request_rec.get("id"),
            "detail": (
                f"PayPal reports the order is {paypal_status}. The payer has not approved it, "
                "so no capture was attempted. Use CONTINUE WITH PAYPAL first."
            ),
        }

    await audit_service.record("paypal_buyer_approved", {"paypal_order_id": order_id, "trigger": "capture"})
    body, status = await _capture_for(payment, request_rec, order_id, trigger="capture")
    return JSONResponse(status_code=status, content=body)


@router.post("/purchase/{request_id}/block")
async def block_purchase(request_id: str):
    rec = await repo.find_one("purchase_requests", {"id": request_id.upper()})
    if not rec:
        return {"error": "not_found"}

    # Read prior state before any update (in-memory mode returns a live dict).
    was_blocked = rec.get("decision") == Decision.BLOCKED.value

    # A block never contacts PayPal and never touches an existing payment state.
    # One payment record per purchase request is created here only if none exists.
    existing_payment = await repo.find_one("payments", {"request_id": rec["id"]})
    existing_order_id = (existing_payment or {}).get("paypal_order_id")

    await repo.update("purchase_requests", {"id": rec["id"]}, {"decision": Decision.BLOCKED.value})
    await repo.update("approvals", {"request_id": rec["id"]}, {"status": "BLOCKED"})

    created_payment = existing_payment is None
    if created_payment:
        await repo.insert("payments", {
            "request_id": rec["id"], "merchant": rec["merchant"], "amount": rec["amount"],
            "currency": rec["currency"], "status": "BLOCKED", "paypal_order_id": None,
        })

    if was_blocked:
        await audit_service.record(
            "duplicate_block_prevented",
            {
                "request_id": rec["id"],
                "note": "Already blocked. No second payment record created.",
                "paypal_order_id": existing_order_id,
            },
        )
    else:
        await audit_service.record(
            "payment_blocked",
            {
                "request_id": rec["id"],
                "note": "No PayPal order created" if not existing_order_id
                else "PayPal order left uncaptured and can no longer be captured (request blocked)",
                "paypal_order_id": existing_order_id,
            },
        )

    return {
        **rec,
        "decision": Decision.BLOCKED.value,
        "paypal": (
            {"status": "NO_ORDER_CREATED"} if not existing_order_id
            else {"status": "EXISTING_ORDER_NOT_CAPTURED", "id": existing_order_id}
        ),
        "payment_record": "created" if created_payment else "unchanged",
        "idempotent_replay": was_blocked,
    }
