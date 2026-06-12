from fastapi import APIRouter
from app.services.strategy import run_strategy
router = APIRouter(prefix="/strategy", tags=["Strategy"])

@router.get("/")
def strategy():
    return {"message": "Strategy working"}

@router.post("/run")
def execute_strategy():
    return run_strategy()


@router.get("/results")
def get_results():
    return run_strategy()