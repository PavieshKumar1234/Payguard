from fastapi import APIRouter

from app.database import repositories as repo

router = APIRouter()


@router.get("/payments")
async def list_payments():
    items = await repo.find("payments")
    return {"payments": items, "db_configured": repo.mongo_configured()}


@router.get("/audit")
async def list_audit():
    items = await repo.find("audit_logs", limit=500)
    return {"audit_logs": items, "db_configured": repo.mongo_configured()}


@router.get("/dashboard")
async def dashboard_summary():
    requests = await repo.find("purchase_requests", limit=500)
    approved = sum(1 for r in requests if r.get("decision") == "APPROVED")
    review = sum(1 for r in requests if r.get("decision") == "REVIEW_REQUIRED")
    blocked = sum(1 for r in requests if r.get("decision") == "BLOCKED")
    # Only COMPLETED payments represent money that actually moved.
    # CREATED = PayPal order exists but the buyer never approved/captured it.
    # APPROVED = PayGuard decision state, not a completed PayPal payment.
    monthly_spend = await repo.sum_amounts("payments", {"status": "COMPLETED"})
    chart = {}
    for r in requests:
        day = (r.get("created_at") or "")[:10]
        chart[day] = chart.get(day, 0) + 1
    return {
        "monthly_spending": monthly_spend,
        "ai_decisions": len(requests),
        "blocked_payments": blocked,
        "human_reviews": review,
        "approved": approved,
        "recent_activity": requests[:5],
        "spending_chart": [{"date": k, "count": v} for k, v in sorted(chart.items())],
        "db_configured": repo.mongo_configured(),
    }


@router.get("/risk")
async def list_risk():
    items = await repo.find("risk_decisions")
    high = sum(1 for i in items if i.get("risk_level") == "HIGH")
    medium = sum(1 for i in items if i.get("risk_level") == "MEDIUM")
    low = sum(1 for i in items if i.get("risk_level") == "LOW")
    return {"risk_decisions": items, "high": high, "medium": medium, "low": low, "db_configured": repo.mongo_configured()}


@router.get("/approvals")
async def list_approvals():
    items = await repo.find("approvals", {"status": "PENDING"})
    return {"approvals": items, "db_configured": repo.mongo_configured()}
