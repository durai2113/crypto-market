import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    FRONTEND_URL = os.getenv("FRONTEND_URL")
    COINGECKO_URL = os.getenv("COINGECKO_URL")


settings = Settings()

cors_origins_str = os.getenv("CORS_ORIGINS", "*")

if cors_origins_str.strip() == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]