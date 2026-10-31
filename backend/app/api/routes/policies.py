from fastapi import APIRouter

from app.database import repositories as repo
from app.schemas.schemas import PolicyIn, PolicyRules
from app.services import audit_service
from app.services.ai_service import AIService

router = APIRouter()


@router.post("/policies/parse")
async def parse_policy(body: PolicyIn):
    parsed = await AIService().parse_policy(body.natural_language)
    await audit_service.record("policy_parsed", {"source": parsed.get("source")})
    return {"rules": parsed, "note": "Review and confirm before this policy becomes active."}


@router.post("/policies/confirm")
async def confirm_policy(payload: dict):
    # Accepts the parsed rules object from POST /policies/parse.
    rules = payload.get("rules", payload)
    doc = {"natural_language": payload.get("natural_language"), "rules": rules, "status": "ACTIVE"}
    await repo.insert("policies", doc)
    await audit_service.record("policy_activated", {"rules": rules})
    return {"status": "ACTIVE", "rules": rules}


@router.get("/policies")
async def list_policies():
    items = await repo.find("policies")
    return {"policies": items, "db_configured": repo.mongo_configured()}
