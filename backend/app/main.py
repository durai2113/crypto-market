from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.scheduler import start_scheduler, shutdown_scheduler

from app.api.routes.market import router as market_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.strategy import router as strategy_router

from app.core.config import CORS_ORIGINS

from app.db.database import engine
from app.db.models import Base


# Create database tables
# Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting scheduler...")
    start_scheduler()

    yield

    print("Application shutting down...")
    shutdown_scheduler()


app = FastAPI(
    title="Crypto Market App",
    lifespan=lifespan
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routes
app.include_router(market_router)
app.include_router(analytics_router)
app.include_router(strategy_router)


@app.get("/")
def root():
    return {
        "message": "Crypto Market API Running"
    }