"""Best-effort Mongo persistence. Endpoints degrade gracefully when the DB
is unreachable or still uses placeholder credentials — never fabricate data."""

from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings
from app.database.mongodb import get_db


def mongo_configured() -> bool:
    uri = get_settings().MONGODB_URI
    return bool(uri) and "YOUR_USERNAME" not in uri and "YOUR_" not in uri


_MEM: dict[str, list[dict]] = {}


def _bucket(collection: str) -> list[dict]:
    return _MEM.setdefault(collection, [])


def _matches(row: dict, query: dict | None) -> bool:
    """Minimal in-memory query matcher: equality plus the `$in` operator."""
    if not query:
        return True
    for key, expected in query.items():
        actual = row.get(key)
        if isinstance(expected, dict) and "$in" in expected:
            if actual not in expected["$in"]:
                return False
        elif actual != expected:
            return False
    return True


async def insert(collection: str, doc: dict[str, Any]) -> bool:
    try:
        doc = {**doc, "created_at": datetime.now(timezone.utc).isoformat()}
        if not mongo_configured():
            _bucket(collection).append(doc)
            return True
        await get_db()[collection].insert_one(doc)
        return True
    except Exception:
        try:
            _bucket(collection).append(doc)
            return True
        except Exception:
            return False


async def find(collection: str, query: dict | None = None, limit: int = 200) -> list[dict]:
    try:
        if not mongo_configured():
            rows = list(reversed(_bucket(collection)))
            if query:
                rows = [r for r in rows if all(r.get(k) == v for k, v in query.items())]
            return rows[:limit]
        cursor = get_db()[collection].find(query or {}, {"_id": 0}).sort("created_at", -1).limit(limit)
        return [doc async for doc in cursor]
    except Exception:
        return []


async def find_one(collection: str, query: dict) -> dict | None:
    try:
        if not mongo_configured():
            for r in reversed(_bucket(collection)):
                if all(r.get(k) == v for k, v in query.items()):
                    return r
            return None
        return await get_db()[collection].find_one(query, {"_id": 0})
    except Exception:
        return None


async def update(collection: str, query: dict, fields: dict) -> bool:
    try:
        if not mongo_configured():
            for r in _bucket(collection):
                if all(r.get(k) == v for k, v in query.items()):
                    r.update(fields)
            return True
        await get_db()[collection].update_one(query, {"$set": fields})
        return True
    except Exception:
        return False


async def count(collection: str, query: dict | None = None) -> int:
    try:
        if not mongo_configured():
            return len(_bucket(collection))
        return await get_db()[collection].count_documents(query or {})
    except Exception:
        return 0


async def sum_amounts(collection: str, query: dict | None = None) -> float:
    try:
        if not mongo_configured():
            return sum(float(r.get("amount", 0)) for r in _bucket(collection) if _matches(r, query))
        pipeline = [{"$match": query or {}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
        async for row in get_db()[collection].aggregate(pipeline):
            return float(row["total"])
        return 0.0
    except Exception:
        return 0.0


async def completed_spend_since(collection: str, since_iso: str) -> float:
    """Sum of COMPLETED payments created at or after `since_iso`.

    This is the only source of truth for "money actually spent". It reads the
    payments collection (the authoritative record of captured PayPal payments)
    and never counts CREATED orders, blocked requests or failed attempts, so a
    spending limit can never be inflated by money that never moved.
    """
    query = {"status": "COMPLETED", "created_at": {"$gte": since_iso}}
    try:
        if not mongo_configured():
            return sum(
                float(r.get("amount", 0))
                for r in _bucket(collection)
                if r.get("status") == "COMPLETED" and (r.get("created_at") or "") >= since_iso
            )
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
        async for row in get_db()[collection].aggregate(pipeline):
            return float(row["total"])
        return 0.0
    except Exception:
        return 0.0
