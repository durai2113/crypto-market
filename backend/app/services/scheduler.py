from apscheduler.schedulers.background import BackgroundScheduler

from app.services.fetcher import fetch_top_crypto, save_to_db


def ingest_market_data():
    try:
        data = fetch_top_crypto()
        save_to_db(data)
        print("Market data updated successfully")
    except Exception as e:
        print(f"Scheduler Error: {e}")


scheduler = BackgroundScheduler()


def start_scheduler():
    scheduler.add_job(
        ingest_market_data,
        trigger="interval",
        minutes=5,
        id="crypto_ingestion",
        replace_existing=True
    )

    scheduler.start()


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()