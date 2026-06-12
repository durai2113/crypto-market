from fastapi import APIRouter
from app.services.analytics import get_market_analytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/")
def analytics():
    return get_market_analytics()