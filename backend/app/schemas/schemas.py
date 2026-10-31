from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator

from app.models.decision import Decision


class PolicyIn(BaseModel):
    natural_language: str


class PolicyRules(BaseModel):
    auto_purchase_limit: float | None = None
    daily_spend_limit: float | None = None
    # Previously parsed from natural language and displayed in the UI but never
    # enforced. Now carried into the deterministic engine and checked against
    # real COMPLETED payment volume.
    monthly_spend_limit: float | None = None
    blocked_merchants: list[str] = Field(default_factory=list)
    trusted_merchants: list[str] = Field(default_factory=list)
    require_review_above: float | None = None
    block_unapproved_merchants: bool = False


# Currencies the PayPal Orders v2 sandbox accepts. Requesting anything else
# fails deep inside PayPal with an opaque 422 CURRENCY_NOT_SUPPORTED, so it is
# rejected up front with an actionable message instead.
PAYPAL_SUPPORTED_CURRENCIES = {
    "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "HUF", "ILS",
    "JPY", "MYR", "MXN", "TWD", "NZD", "NOK", "PHP", "PLN", "GBP", "RUB",
    "SGD", "SEK", "CHF", "THB", "USD",
}


class PurchaseRequestIn(BaseModel):
    merchant: str
    amount: float
    # PayPal Sandbox does not support INR; defaulting to it made every request
    # that omitted a currency fail at order creation with CURRENCY_NOT_SUPPORTED.
    currency: str = "USD"
    item_summary: str | None = None
    # Optional free-text note supplied by the requester. Stored and shown in the
    # UI only; the deterministic policy engine never reads it.
    description: str | None = None
    # Optional client-generated idempotency key. Replaying the same value
    # (double-click, retry, network replay) returns the original decision
    # instead of creating a second purchase request.
    client_request_id: str | None = None

    @field_validator("amount")
    @classmethod
    def _positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("merchant")
    @classmethod
    def _merchant_required(cls, v: str) -> str:
        name = (v or "").strip()
        if not name:
            raise ValueError("merchant is required")
        return name

    @field_validator("currency")
    @classmethod
    def _supported_currency(cls, v: str) -> str:
        code = (v or "").strip().upper()
        if code not in PAYPAL_SUPPORTED_CURRENCIES:
            raise ValueError(
                f"currency '{v}' is not supported by PayPal. "
                f"Supported: {', '.join(sorted(PAYPAL_SUPPORTED_CURRENCIES))}"
            )
        return code

    @field_validator("item_summary", "description", "client_request_id")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        text = v.strip()
        return text or None


class PurchaseRequestOut(BaseModel):
    id: str
    merchant: str
    amount: float
    currency: str
    decision: Decision
    reason: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
