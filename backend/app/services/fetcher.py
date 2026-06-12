import requests
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

COINGECKO_URL = os.getenv("COINGECKO_URL")

def fetch_top_crypto():
    if not COINGECKO_URL:
        raise ValueError("COINGECKO_URL is missing in .env")

    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 50,
        "page": 1,
        "sparkline": False
    }

    response = requests.get(COINGECKO_URL, params=params)

    if response.status_code != 200:
        raise Exception(f"CoinGecko API error: {response.text}")

    data = response.json()

    return [
        {
            "symbol": coin["symbol"].upper(),
            "price": coin["current_price"],
            "volume": coin["total_volume"],
            "timestamp": datetime.utcnow()
        }
        for coin in data
    ]


from app.db.database import SessionLocal
from app.db.models import MarketData

def save_to_db(db_or_data, data=None):
    if data is not None:
        db = db_or_data
        records = data
        close_db = False
    else:
        db = SessionLocal()
        records = db_or_data
        close_db = True

    try:
        for item in records:
            market_data = MarketData(
                symbol=item["symbol"],
                price=item["price"],
                volume=item["volume"],
                timestamp=item.get("timestamp") or datetime.utcnow()
            )
            db.add(market_data)
        db.commit()
        print(f"Successfully saved {len(records)} records to DB.")
    except Exception as e:
        db.rollback()
        print(f"Error saving to DB: {e}")
        raise e
    finally:
        if close_db:
            db.close()