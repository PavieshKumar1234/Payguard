"""AI-based contextual risk analysis. Advisory only; never overrides policy_engine."""

from app.services.ai_service import AIService


async def analyze(merchant: str, amount: float, currency: str) -> dict:
    return await AIService().risk_reasoning(merchant=merchant, amount=amount, currency=currency)
