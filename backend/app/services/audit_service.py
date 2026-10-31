from datetime import datetime, timezone

from app.database.repositories import insert


async def record(event_type: str, payload: dict) -> bool:
    return await insert("audit_logs", {"event_type": event_type, "payload": payload})
