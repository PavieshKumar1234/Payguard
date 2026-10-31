from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import misc, policies, purchase
from app.core.config import get_settings
from app.database.mongodb import get_client, init_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    yield


app = FastAPI(title="PayGuard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(policies.router, prefix="/api", tags=["policies"])
app.include_router(purchase.router, prefix="/api", tags=["purchase"])
app.include_router(misc.router, prefix="/api", tags=["overview"])


@app.get("/api/health")
async def health():
    settings = get_settings()
    db_status = "unreachable"
    try:
        await get_client().admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "unreachable"
    return {
        "status": "ok",
        "service": "payguard-backend",
        "mongodb": db_status if settings_mongo_placeholder_free() else "not_configured",
        "paypal_configured": settings.paypal_configured(),
        "ai_configured": settings.gemini_configured(),
    }


def settings_mongo_placeholder_free() -> bool:
    from app.database.repositories import mongo_configured
    return mongo_configured()
