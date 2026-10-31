"""Deterministic policy enforcement. The LLM never decides hard financial rules."""

from app.models.decision import Decision
from app.schemas.schemas import PolicyRules


class SpendContext:
    """Real completed-spend totals supplied by the caller.

    Only COMPLETED PayPal payments count as money that actually moved. An order
    that was merely CREATED (or blocked, or failed) is deliberately excluded so
    the engine can never block a purchase because of money that never moved.
    """

    __slots__ = ("daily_completed", "monthly_completed")

    def __init__(self, daily_completed: float = 0.0, monthly_completed: float = 0.0) -> None:
        self.daily_completed = float(daily_completed or 0.0)
        self.monthly_completed = float(monthly_completed or 0.0)


def evaluate(
    amount: float,
    merchant: str,
    rules: PolicyRules,
    spend: SpendContext | None = None,
) -> tuple[Decision, str]:
    spend = spend or SpendContext()
    violations = []
    blocked = merchant.lower() in {m.lower() for m in rules.blocked_merchants}
    if blocked:
        violations.append(f"Merchant '{merchant}' is blocked by policy")
    merchant_unapproved = rules.block_unapproved_merchants and merchant.lower() not in {m.lower() for m in rules.trusted_merchants}
    if merchant_unapproved:
        violations.append(f"Merchant '{merchant}' is not in the approved merchant list")
    over_limit = rules.auto_purchase_limit is not None and amount > rules.auto_purchase_limit
    if over_limit:
        violations.append(f"Amount {amount} exceeds automatic limit {rules.auto_purchase_limit}")

    # Rolling 24h hard cap. Previously dead code: the schema had the field but
    # nothing ever populated it, so the rule could never fire.
    over_daily = (
        rules.daily_spend_limit is not None
        and (spend.daily_completed + amount) > rules.daily_spend_limit
    )
    if over_daily:
        violations.append(
            f"Amount {amount} would bring last-24h completed spend to "
            f"{round(spend.daily_completed + amount, 2)}, above the daily limit {rules.daily_spend_limit}"
        )

    if violations and (merchant_unapproved or blocked or over_daily):
        return Decision.BLOCKED, "; ".join(violations)

    # Rolling 30-day budget. Previously parsed and displayed to the user as an
    # active rule but never enforced. Overrunning a budget is a reason for a
    # human to look, not an automatic hard block.
    if rules.monthly_spend_limit is not None:
        projected = spend.monthly_completed + amount
        if projected > rules.monthly_spend_limit:
            return Decision.REVIEW_REQUIRED, (
                f"Amount {amount} would bring last-30-day completed spend to "
                f"{round(projected, 2)}, above the monthly limit {rules.monthly_spend_limit} "
                f"— requires approval"
            )

    if over_limit:
        threshold = rules.require_review_above if rules.require_review_above is not None else rules.auto_purchase_limit
        return Decision.REVIEW_REQUIRED, f"Amount {amount} exceeds automatic limit {threshold} — requires approval"

    return Decision.APPROVED, "Within all deterministic limits"
