from sqlalchemy import text
from app.db.database import SessionLocal
from app.db.models import MarketData


def run_strategy():
    db = SessionLocal()

    try:
        # Single database query using window function to avoid N+1 query latency
        query = text("""
            SELECT symbol, price, timestamp
            FROM (
                SELECT symbol, price, timestamp,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
                FROM market_data
            ) t
            WHERE rn <= 2
        """)

        rows = db.execute(query).fetchall()

        # Group rows by symbol
        groups = {}
        for row in rows:
            symbol = row[0]
            price = row[1]
            if symbol not in groups:
                groups[symbol] = []
            groups[symbol].append(price)

        results = []
        for symbol, prices in groups.items():
            if len(prices) < 2:
                continue

            # Since the rows are sorted DESC, prices[0] is latest, prices[1] is previous
            latest = prices[0]
            previous = prices[1]

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