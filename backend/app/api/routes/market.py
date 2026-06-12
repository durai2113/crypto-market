from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import MarketData
from app.services.fetcher import fetch_top_crypto, save_to_db

router = APIRouter(prefix="/markets", tags=["Markets"])


# ✅ GET ALL MARKETS (FROM DB)
@router.get("/")
def get_all_markets(db: Session = Depends(get_db)):
    data = (
        db.query(MarketData)
#        .order_by(MarketData.timestamp.desc())
        .limit(10)   
        .all()
    )

    return data


# ✅ GET LATEST PRICE FOR ONE SYMBOL
@router.get("/prices")
def get_price(symbol: str, db: Session = Depends(get_db)):
    data = (
        db.query(MarketData)
        .filter(MarketData.symbol == symbol)
        .order_by(MarketData.timestamp.desc())
        .first()
    )

    if not data:
        return {"message": "No data found"}

    return data


# ✅ FETCH FROM COINGECKO + SAVE TO DB
@router.post("/fetch")
def fetch_and_store(db: Session = Depends(get_db)):
    try:
        data = fetch_top_crypto()

        save_to_db(db, data)   # 🔥 IMPORTANT FIX

        return {
            "message": "Data fetched and saved",
            "count": len(data)
        }

    except Exception as e:
        return {"error": str(e)}