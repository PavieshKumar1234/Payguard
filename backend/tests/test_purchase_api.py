"""End-to-end tests for the purchase-request API and the PayPal authorisation gate.

These cover the guarantees that matter for money safety:

* valid requests are approved and persisted,
* invalid requests are rejected with 422,
* over-limit requests are queued for human approval,
* blocked requests are blocked, persisted, and can never create a PayPal order,
* the capture/return gate refuses anything that is not APPROVED.
"""

from app.database import repositories as repo
from app.services import paypal_service


async def _seed_policy(client, **rules):
    res = await client.post(
        "/api/policies/confirm",
        json={"rules": rules, "natural_language": "test policy"},
    )
    assert res.status_code == 200, res.text
    return res.json()


# --------------------------------------------------------------------------- #
# Valid / invalid submissions
# --------------------------------------------------------------------------- #
async def test_valid_request_is_approved_and_persisted(client):
    res = await client.post(
        "/api/purchase/request",
        json={
            "merchant": "Acme Store",
            "amount": 120.5,
            "currency": "usd",
            "item_summary": "Wireless Mouse",
            "description": "Office upgrade",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["decision"] == "APPROVED"
    assert body["reason"] == "Within all deterministic limits"
    assert body["merchant"] == "Acme Store"
    assert body["item_summary"] == "Wireless Mouse"
    assert body["description"] == "Office upgrade"
    # currency is normalised to upper-case
    assert body["currency"] == "USD"
    assert body["id"]

    listing = await client.get("/api/purchase/requests")
    assert res.status_code == 200
    ids = [r["id"] for r in listing.json()["requests"]]
    assert body["id"] in ids


async def test_amount_must_be_positive(client):
    for bad in (0, -5):
        res = await client.post("/api/purchase/request", json={"merchant": "Acme", "amount": bad})
        assert res.status_code == 422, f"amount={bad} should be rejected"


async def test_merchant_is_required(client):
    res = await client.post("/api/purchase/request", json={"merchant": "   ", "amount": 10})
    assert res.status_code == 422


async def test_currency_must_be_supported_by_paypal(client):
    res = await client.post(
        "/api/purchase/request", json={"merchant": "Acme", "amount": 10, "currency": "XYZ"}
    )
    assert res.status_code == 422


async def test_missing_body_is_rejected(client):
    res = await client.post("/api/purchase/request", json={})
    assert res.status_code == 422


# --------------------------------------------------------------------------- #
# Review-required path
# --------------------------------------------------------------------------- #
async def test_over_limit_queues_human_approval(client):
    await _seed_policy(client, autoPurchaseLimit=500, requireApprovalAbove=500)
    res = await client.post("/api/purchase/request", json={"merchant": "Acme", "amount": 750})
    body = res.json()
    assert body["decision"] == "REVIEW_REQUIRED"

    pending = await client.get("/api/purchase/requests?decision=REVIEW_REQUIRED")
    assert body["id"] in [r["id"] for r in pending.json()["requests"]]

    approval = await repo.find_one("approvals", {"request_id": body["id"]})
    assert approval is not None
    assert approval["status"] == "PENDING"


async def test_approval_without_paypal_credentials_reports_not_configured(client):
    await _seed_policy(client, autoPurchaseLimit=500)
    res = await client.post("/api/purchase/request", json={"merchant": "Acme", "amount": 900})
    rid = res.json()["id"]
    assert res.json()["decision"] == "REVIEW_REQUIRED"

    appr = await client.post(f"/api/purchase/{rid}/approve")
    assert appr.status_code == 200, appr.text
    ab = appr.json()
    assert ab["decision"] == "APPROVED"
    # PayPal is deliberately unconfigured in tests: the response must be
    # truthful rather than reporting a fabricated order.
    assert ab["paypal"]["status"] == "NOT_CONFIGURED"

    payment = await repo.find_one("payments", {"request_id": rid})
    assert payment is not None
    assert payment["status"] == "PAYPAL_NOT_CONFIGURED"
    assert not payment.get("paypal_order_id")


# --------------------------------------------------------------------------- #
# Blocked path
# --------------------------------------------------------------------------- #
async def test_blocked_merchant_is_blocked_and_persists_no_order(client):
    await _seed_policy(client, blockedMerchants=["BadCorp"], autoPurchaseLimit=500)
    res = await client.post("/api/purchase/request", json={"merchant": "BadCorp", "amount": 20})
    body = res.json()
    assert body["decision"] == "BLOCKED"
    assert "blocked" in body["reason"].lower()

    # A blocked request never produces a payment record or a PayPal order.
    assert await repo.find_one("payments", {"request_id": body["id"]}) is None

    # ...and it can never be approved into one.
    appr = await client.post(f"/api/purchase/{body['id']}/approve")
    assert appr.status_code == 200
    assert appr.json().get("error") == "blocked_transactions_cannot_be_approved"
    assert await repo.find_one("payments", {"request_id": body["id"]}) is None


async def test_blocked_request_never_calls_paypal(client, monkeypatch):
    async def _forbidden(*args, **kwargs):
        raise AssertionError("PayPal.create_order must never run for a blocked request")

    monkeypatch.setattr(paypal_service.PayPalService, "create_order", _forbidden)
    await _seed_policy(client, blockedMerchants=["BadCorp"], autoPurchaseLimit=500)

    res = await client.post("/api/purchase/request", json={"merchant": "BadCorp", "amount": 20})
    assert res.json()["decision"] == "BLOCKED"


async def test_unapproved_merchant_blocks_when_policy_requires_allowlist(client):
    await _seed_policy(
        client,
        autoPurchaseLimit=500,
        allowedMerchants=["TrustedShop"],
        blockUnapprovedMerchants=True,
    )
    res = await client.post("/api/purchase/request", json={"merchant": "RandomShop", "amount": 10})
    assert res.json()["decision"] == "BLOCKED"


# --------------------------------------------------------------------------- #
# Capture authorisation gate
# --------------------------------------------------------------------------- #
async def test_capture_unknown_order_is_not_found(client):
    res = await client.post("/api/payments/DOES-NOT-EXIST/capture")
    assert res.status_code == 404
    assert res.json()["status"] == "NOT_FOUND"


async def test_capture_gate_rejects_non_approved_request(client):
    # Simulate a payment row linked to a BLOCKED request; the shared gate must
    # refuse before any PayPal call.
    await repo.insert(
        "purchase_requests",
        {"id": "BLK0001", "merchant": "BadCorp", "amount": 5, "currency": "USD",
         "decision": "BLOCKED", "reason": "blocked by policy"},
    )
    await repo.insert(
        "payments",
        {"request_id": "BLK0001", "merchant": "BadCorp", "amount": 5, "currency": "USD",
         "status": "CREATED", "paypal_order_id": "ORDER123"},
    )

    capture = await client.post("/api/payments/ORDER123/capture")
    assert capture.status_code == 403
    assert capture.json()["status"] == "FORBIDDEN"
    assert capture.json()["decision"] == "BLOCKED"

    returned = await client.get("/api/payments/ORDER123/return")
    assert returned.status_code == 403
    assert returned.json()["status"] == "FORBIDDEN"


# --------------------------------------------------------------------------- #
# Idempotency / persistence
# --------------------------------------------------------------------------- #
async def test_duplicate_submission_with_same_client_request_id_is_idempotent(client):
    payload = {"merchant": "Acme", "amount": 25, "client_request_id": "req-123"}
    first = await client.post("/api/purchase/request", json=payload)
    second = await client.post("/api/purchase/request", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert second.json().get("idempotent_replay") is True

    rows = [
        r
        for r in (await client.get("/api/purchase/requests")).json()["requests"]
        if r.get("client_request_id") == "req-123"
    ]
    assert len(rows) == 1


async def test_distinct_submissions_are_persisted_separately(client):
    a = await client.post("/api/purchase/request", json={"merchant": "Acme", "amount": 10})
    b = await client.post("/api/purchase/request", json={"merchant": "Acme", "amount": 10})
    assert a.json()["id"] != b.json()["id"]
    listing = await client.get("/api/purchase/requests")
    assert len(listing.json()["requests"]) == 2


async def test_every_decision_writes_audit_logs(client):
    res = await client.post("/api/purchase/request", json={"merchant": "Acme", "amount": 10})
    rid = res.json()["id"]
    events = (await client.get("/api/audit")).json()["audit_logs"]
    types = [e["event_type"] for e in events if e["payload"].get("request_id") == rid]
    assert "purchase_request_received" in types
    assert "policy_evaluated" in types
    assert "risk_analysis_completed" in types
