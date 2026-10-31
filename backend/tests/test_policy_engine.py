"""Deterministic policy engine unit tests.

The engine is the security core: it must always approve within limits, escalate
over-limit purchases to a human, and hard-block policy violations.
"""

from app.models.decision import Decision
from app.schemas.schemas import PolicyRules
from app.services.policy_engine import SpendContext, evaluate


def test_within_limits_approves():
    decision, reason = evaluate(120.0, "Acme", PolicyRules(auto_purchase_limit=500))
    assert decision is Decision.APPROVED
    assert "Within all deterministic limits" in reason


def test_exactly_at_limit_approves():
    decision, _ = evaluate(500.0, "Acme", PolicyRules(auto_purchase_limit=500))
    assert decision is Decision.APPROVED


def test_over_limit_requires_review():
    decision, reason = evaluate(700.0, "Acme", PolicyRules(auto_purchase_limit=500))
    assert decision is Decision.REVIEW_REQUIRED
    assert "requires approval" in reason


def test_blocked_merchant_blocks():
    decision, reason = evaluate(
        10.0, "BadCorp", PolicyRules(auto_purchase_limit=500, blocked_merchants=["BadCorp"])
    )
    assert decision is Decision.BLOCKED
    assert "blocked by policy" in reason


def test_blocked_merchant_wins_over_over_limit_review():
    decision, _ = evaluate(
        900.0, "BadCorp", PolicyRules(auto_purchase_limit=500, blocked_merchants=["BadCorp"])
    )
    assert decision is Decision.BLOCKED


def test_unapproved_merchant_blocks_when_required():
    rules = PolicyRules(
        auto_purchase_limit=500,
        trusted_merchants=["TrustedShop"],
        block_unapproved_merchants=True,
    )
    decision, reason = evaluate(10.0, "RandomShop", rules)
    assert decision is Decision.BLOCKED
    assert "not in the approved merchant list" in reason


def test_trusted_merchant_passes_when_allowlist_required():
    rules = PolicyRules(
        auto_purchase_limit=500,
        trusted_merchants=["TrustedShop"],
        block_unapproved_merchants=True,
    )
    decision, _ = evaluate(10.0, "TrustedShop", rules)
    assert decision is Decision.APPROVED


def test_daily_limit_blocks_on_completed_spend():
    rules = PolicyRules(auto_purchase_limit=500, daily_spend_limit=150)
    decision, reason = evaluate(100.0, "Acme", rules, SpendContext(daily_completed=100.0))
    assert decision is Decision.BLOCKED
    assert "daily limit" in reason


def test_monthly_limit_requires_review():
    rules = PolicyRules(auto_purchase_limit=500, monthly_spend_limit=150)
    decision, reason = evaluate(100.0, "Acme", rules, SpendContext(monthly_completed=100.0))
    assert decision is Decision.REVIEW_REQUIRED
    assert "monthly limit" in reason
