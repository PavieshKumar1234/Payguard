import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(get_settings().MONGODB_URI, serverSelectionTimeoutMS=3000)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[get_settings().MONGODB_DATABASE]
    return _db


COLLECTIONS = [
    "users",
    "policies",
    "purchase_requests",
    "risk_decisions",
    "approvals",
    "payments",
    "audit_logs",
    "spending_history",
    "merchants",
]


async def _report_duplicates(collection: str, field: str) -> list[str]:
    """Return conflicting values for `field`. Read-only: never mutates data."""
    pipeline = [
        {"$match": {field: {"$exists": True}}},
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    return [str(row["_id"]) async for row in get_db()[collection].aggregate(pipeline)]


async def init_indexes() -> None:
    """Create database-level uniqueness guarantees at startup.

    Safe to run repeatedly: `create_index` is idempotent. Never deletes,
    updates, or recreates existing data. If pre-existing duplicates would
    block an index they are reported explicitly and startup continues.
    """
    from app.database.repositories import mongo_configured  # local import avoids a cycle

    if not mongo_configured():
        logger.info("MongoDB not configured - skipping index creation (in-memory mode).")
        return

    # purchase_requests.id is generated per request and must never repeat.
    duplicates = await _report_duplicates("purchase_requests", "id")
    if duplicates:
        logger.error(
            "purchase_requests.id has %d duplicate value(s): %s. Unique index NOT created. "
            "Resolve these manually - no data was deleted.",
            len(duplicates),
            duplicates,
        )
    else:
        try:
            await get_db()["purchase_requests"].create_index(
                "id", unique=True, name="unique_purchase_requests_id"
            )
            logger.info("Index ready: purchase_requests.id (unique)")
        except Exception as exc:
            logger.error("Could not create unique index on purchase_requests.id: %s", exc)

    # payments.paypal_order_id must be unique, but blocked/pending payments
    # legitimately hold no order ID. The partial filter indexes only real
    # string order IDs so those documents are not treated as duplicates.
    pay_duplicates = await _report_duplicates("payments", "paypal_order_id")
    pay_duplicates = [d for d in pay_duplicates if d not in ("None", "")]
    if pay_duplicates:
        logger.error(
            "payments.paypal_order_id has %d duplicate value(s): %s. Unique index NOT created. "
            "Resolve these manually - no data was deleted.",
            len(pay_duplicates),
            pay_duplicates,
        )
    else:
        try:
            await get_db()["payments"].create_index(
                "paypal_order_id",
                unique=True,
                name="unique_payments_paypal_order_id",
                partialFilterExpression={"paypal_order_id": {"$type": "string"}},
            )
            logger.info("Index ready: payments.paypal_order_id (unique, string values only)")
        except Exception as exc:
            logger.error("Could not create unique index on payments.paypal_order_id: %s", exc)
