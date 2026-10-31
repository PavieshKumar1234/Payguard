"""Single LLM client module backed by Google Gemini (google-genai SDK).

No hardcoded keys. Gemini only parses policies and explains risk â€” it never
authorizes payments. Falls back to a deterministic local parser, clearly labeled.
"""

import asyncio
import json
import logging
import re

from app.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    from pydantic import BaseModel as _BM

    class _PolicyParseSchema(_BM):
        autoPurchaseLimit: float | None = None
        dailySpendLimit: float | None = None
        monthlySubscriptionLimit: float | None = None
        allowedMerchants: list[str] = []
        requireApprovalAbove: float | None = None
        blockedMerchants: list[str] = []
        blockUnapprovedMerchants: bool = False

except Exception:  # pragma: no cover
    _PolicyParseSchema = None

try:
    from google import genai
    from google.genai import types
except Exception:  # pragma: no cover
    genai = None
    types = None


class AIService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _generate(self, system: str, user: str, schema=None) -> str:
        if genai is None:
            raise RuntimeError("google-genai package is not installed")
        client = genai.Client(api_key=self.settings.gemini_key)
        resp = client.models.generate_content(
            model=self.settings.GEMINI_MODEL,
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        return resp.text or ""

    @staticmethod
    def _extract_json(raw: str) -> dict:
        text = re.sub(r"^```json|```$", "", raw.strip(), flags=re.M).strip()
        return json.loads(text)

    async def parse_policy(self, natural_language: str) -> dict:
        if self.settings.gemini_configured():
            try:
                raw = await asyncio.to_thread(
                    self._generate,
                    "Extract structured purchase policy JSON with keys: autoPurchaseLimit (number|null), "
                    "dailySpendLimit (number|null), "
                    "monthlySubscriptionLimit (number|null), allowedMerchants (string[]), "
                    "requireApprovalAbove (number|null), blockedMerchants (string[]), "
                    "blockUnapprovedMerchants (boolean). Return JSON only. "
                    "Map phrases like 'not more than $X automatically' to autoPurchaseLimit=X. "
                    "Map 'purchases above $X must require approval' to requireApprovalAbove=X. "
                    "Map 'never more than $X per day' or 'daily cap of $X' to dailySpendLimit=X. "
                    "Map 'monthly budget of $X' to monthlySubscriptionLimit=X. "
                    "Map 'never buy from merchants I haven't approved' to blockUnapprovedMerchants=true.",
                    natural_language,
                    _PolicyParseSchema,
                )
                data = self._extract_json(raw)
                if _PolicyParseSchema is not None:
                    data = _PolicyParseSchema.model_validate(data).model_dump()
                return {"source": "ai", **data}
            except Exception as exc:
                logger.warning("policy_parse Gemini failed type=%s status=%s detail=%s", type(exc).__name__, getattr(exc, "status_code", None), str(exc)[:160].replace(self.settings.gemini_key, "[redacted]") if self.settings.gemini_key else str(exc)[:160])
                return {**self._local_parse(natural_language), "source": "local_fallback", "ai_error": str(exc)[:160]}
        return {**self._local_parse(natural_language), "source": "local_fallback_unconfigured"}

    @staticmethod
    def _local_parse(text: str) -> dict:
        limits = [float(x.replace(",", "")) for x in re.findall(r"(?:\$|₹|€|£|USD\s?|Rs\.?|INR)\s?([\d,]+)", text)]
        auto = limits[0] if limits else None
        monthly = None
        m = re.search(r"(?:monthly|subscription)[^.\n]*?(?:\$|₹|€|£|USD\s?|Rs\.?|INR)\s?([\d,]+)", text, re.I)
        if m:
            monthly = float(m.group(1).replace(",", ""))
        block_unapproved = bool(re.search(r"haven'?t approved|not approved|unapproved merchants|Never buy", text, re.I))
        merchants = [w for w in re.findall(r"\b[A-Z][A-Za-z]+\b", text) if w not in {"My", "Anything", "Never", "AI", "Monthly", "Define", "Pay", "Rs", "INR", "Any"}]
        return {
            "autoPurchaseLimit": auto,
            "dailySpendLimit": None,
            "monthlySubscriptionLimit": monthly,
            "allowedMerchants": merchants,
            "requireApprovalAbove": auto,
            "blockedMerchants": [],
            "blockUnapprovedMerchants": block_unapproved,
        }

    async def risk_reasoning(self, merchant: str, amount: float, currency: str, history: list | None = None) -> dict:
        if self.settings.gemini_configured():
            try:
                raw = await asyncio.to_thread(
                    self._generate,
                    "You are a contextual risk analyst for payments. Return JSON with keys: "
                    "risk_level (LOW|MEDIUM|HIGH), signals (string[]), reason (string). "
                    "You advise only; you never approve, block, or authorize payments.",
                    f"Merchant: {merchant}. Amount: {amount} {currency}. History: {history or []}",
                )
                return {"source": "ai", **self._extract_json(raw)}
            except Exception as exc:
                logger.warning("risk_reasoning Gemini failed type=%s status=%s detail=%s", type(exc).__name__, getattr(exc, "status_code", None), str(exc)[:160].replace(self.settings.gemini_key, "[redacted]") if self.settings.gemini_key else str(exc)[:160])
                return {**self._local_risk(merchant, amount), "source": "local_fallback", "ai_error": str(exc)[:160]}
        return {**self._local_risk(merchant, amount), "source": "local_fallback_unconfigured"}

    @staticmethod
    def _local_risk(merchant: str, amount: float) -> dict:
        signals = []
        level = "LOW"
        if amount > 500:
            signals.append("Purchase significantly above automatic limit")
            level = "MEDIUM"
        if amount > 10000:
            signals.append("Large transaction")
            level = "HIGH"
        if "unknown" in merchant.lower() or merchant.lower() in {"unknownstore"}:
            signals += ["First-time merchant", "Merchant not approved"]
            level = "HIGH"
        if not signals:
            signals.append("No unusual signals")
        reason = {
            "HIGH": "Amount and/or merchant context is substantially outside normal usage.",
            "MEDIUM": "Transaction is above the automatic limit but otherwise routine.",
            "LOW": "Transaction matches normal spending behavior.",
        }[level]
        return {"risk_level": level, "signals": signals, "reason": reason}
