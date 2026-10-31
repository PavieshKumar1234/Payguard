"""Shared test fixtures.

Everything runs fully offline and deterministically:

* The Mongo URI is forced to a placeholder, so ``repositories.mongo_configured()``
  returns False and every read/write is served from the in-memory fallback.
* PayPal and Gemini credentials are blanked, so no network call is ever made and
  the code takes its "not configured" branch.

The in-memory bucket is cleared between tests so each test starts from a clean
database state.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ["MONGODB_URI"] = "mongodb://YOUR_USERNAME:YOUR_PASSWORD@localhost:27017"
os.environ["MONGODB_DATABASE"] = "payguard_test"
os.environ["PAYPAL_CLIENT_ID"] = ""
os.environ["PAYPAL_CLIENT_SECRET"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["AI_API_KEY"] = ""

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.database import repositories as repo  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    get_settings.cache_clear()
    repo._MEM.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://payguard.test") as c:
        yield c
    repo._MEM.clear()
