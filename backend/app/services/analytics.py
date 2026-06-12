import pandas as pd
from app.db.database import SessionLocal
from app.db.models import MarketData


def get_market_analytics():
    db = SessionLocal()

    try:
        data = db.query(MarketData).all()

        if not data:
            return {"message": "No data found"}

        rows = []

        for item in data:
            rows.append({
                "symbol": item.symbol,
                "price": item.price,
                "volume": item.volume,
                "timestamp": item.timestamp
            })

        df = pd.DataFrame(rows)

        latest = (
            df.sort_values("timestamp")
            .groupby("symbol")
            .tail(1)
        )

        ranking = (
            latest.sort_values("price", ascending=False)
            [["symbol", "price", "volume"]]
            .to_dict(orient="records")
        )

        return {
            "total_assets": len(latest),
            "ranking": ranking
        }

    finally:
        db.close()