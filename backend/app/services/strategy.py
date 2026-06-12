from app.db.database import SessionLocal
from app.db.models import MarketData


def run_strategy():
    db = SessionLocal()

    try:
        symbols = db.query(MarketData.symbol).distinct().all()

        results = []

        for symbol_row in symbols:
            symbol = symbol_row[0]

            records = (
                db.query(MarketData)
                .filter(MarketData.symbol == symbol)
                .order_by(MarketData.timestamp.desc())
                .limit(2)
                .all()
            )

            if len(records) < 2:
                continue

            latest = records[0].price
            previous = records[1].price

            if latest > previous:
                signal = "BUY"
            elif latest < previous:
                signal = "SELL"
            else:
                signal = "HOLD"

            results.append({
                "symbol": symbol,
                "latest_price": latest,
                "previous_price": previous,
                "signal": signal
            })

        return results

    finally:
        db.close()