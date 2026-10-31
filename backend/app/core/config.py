from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "payguard"

    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_ENVIRONMENT: str = "sandbox"
    PAYPAL_RETURN_URL: str = "http://localhost:5173/payment/return"
    PAYPAL_CANCEL_URL: str = "http://localhost:5173/payment/cancel"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-lite-latest"
    AI_API_KEY: str = ""  # legacy fallback for the Gemini key

    @property
    def paypal_base_url(self) -> str:
        if self.PAYPAL_ENVIRONMENT.lower() == "live":
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"

    def paypal_configured(self) -> bool:
        cid, secret = self.PAYPAL_CLIENT_ID, self.PAYPAL_CLIENT_SECRET
        return bool(cid and secret and "YOUR_" not in cid and "YOUR_" not in secret)

    def gemini_configured(self) -> bool:
        key = self.GEMINI_API_KEY or self.AI_API_KEY
        return bool(key and "YOUR_" not in key)

    @property
    def gemini_key(self) -> str:
        return self.GEMINI_API_KEY or self.AI_API_KEY


@lru_cache
def get_settings() -> Settings:
    return Settings()
