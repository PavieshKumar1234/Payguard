"""Real PayPal Sandbox REST integration. Credentials only from server-side env.

Never call any PayPal endpoint before the deterministic policy engine has decided.
Blocked transactions must never create an order.
"""

import base64

import httpx

from app.core.config import get_settings


class PayPalConfigError(RuntimeError):
    pass


class PayPalService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _require_credentials(self) -> None:
        if not self.settings.paypal_configured():
            raise PayPalConfigError(
                "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env."
            )

    async def get_access_token(self) -> str:
        self._require_credentials()
        auth = base64.b64encode(
            f"{self.settings.PAYPAL_CLIENT_ID}:{self.settings.PAYPAL_CLIENT_SECRET}".encode()
        ).decode()
        async with httpx.AsyncClient(base_url=self.settings.paypal_base_url, timeout=20) as client:
            resp = await client.post(
                "/v1/oauth2/token",
                headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
                content="grant_type=client_credentials",
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    def _headers(self, token: str, idempotency_key: str | None = None) -> dict:
        """Auth headers plus PayPal's official idempotency header when provided.

        The key must be stable for the same logical operation so PayPal returns
        the original result instead of creating a duplicate order.
        """
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        if idempotency_key:
            headers["PayPal-Request-Id"] = idempotency_key
        return headers

    async def create_order(
        self,
        amount: float,
        currency: str,
        reference: str,
        idempotency_key: str | None = None,
    ) -> dict:
        token = await self.get_access_token()
        async with httpx.AsyncClient(base_url=self.settings.paypal_base_url, timeout=20) as client:
            resp = await client.post(
                "/v2/checkout/orders",
                headers=self._headers(token, idempotency_key),
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [
                        {"reference_id": reference, "amount": {"currency_code": currency, "value": f"{amount:.2f}"}}
                    ],
                    "application_context": {
                        "brand_name": "PayGuard",
                        "landing_page": "LOGIN",
                        "shipping_preference": "NO_SHIPPING",
                        "user_action": "PAY_NOW",
                        "return_url": self.settings.PAYPAL_RETURN_URL,
                        "cancel_url": self.settings.PAYPAL_CANCEL_URL,
                    },
                },
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"PayPal create_order {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    @staticmethod
    def approval_url(order: dict) -> str | None:
        """Extract the real PayPal HATEOAS `rel: approve` URL from an order response.

        This is the URL the payer must visit to approve the order before it can
        be captured. PayPal rejects capture with ORDER_NOT_APPROVED until they do.
        """
        for link in order.get("links") or []:
            if link.get("rel") == "approve" and link.get("href"):
                return link["href"]
        return None

    async def get_order(self, order_id: str) -> dict:
        """Read the authoritative current state of an order straight from PayPal.

        PayGuard never infers payment state from the browser: the return and
        capture paths both call this to learn whether the payer really approved.
        """
        token = await self.get_access_token()
        async with httpx.AsyncClient(base_url=self.settings.paypal_base_url, timeout=20) as client:
            resp = await client.get(f"/v2/checkout/orders/{order_id}", headers=self._headers(token))
            if resp.status_code >= 400:
                raise RuntimeError(f"PayPal get_order {resp.status_code}: {resp.text[:300]}")
            return resp.json()

    async def capture_order(self, order_id: str, idempotency_key: str | None = None) -> dict:
        token = await self.get_access_token()
        async with httpx.AsyncClient(base_url=self.settings.paypal_base_url, timeout=20) as client:
            resp = await client.post(
                f"/v2/checkout/orders/{order_id}/capture",
                headers=self._headers(token, idempotency_key),
            )
            if resp.status_code >= 400:
                # Keep PayPal's actionable error body (e.g. ORDER_NOT_APPROVED and
                # the `rel: approve` link). raise_for_status() alone hides it and
                # leaves the operator with an opaque "422 Unknown Error".
                raise RuntimeError(f"PayPal capture_order {resp.status_code}: {resp.text[:300]}")
            return resp.json()
