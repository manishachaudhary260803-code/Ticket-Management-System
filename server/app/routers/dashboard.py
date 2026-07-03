from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_by_ai_count: int
    resolved_by_ai_percent: float
    avg_resolution_time_seconds: float | None


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = db.execute(text("SELECT * FROM get_dashboard_stats()")).mappings().one()
    return DashboardStats(
        total_tickets=row["total_tickets"],
        open_tickets=row["open_tickets"],
        resolved_by_ai_count=row["resolved_by_ai_count"],
        resolved_by_ai_percent=float(row["resolved_by_ai_percent"]),
        avg_resolution_time_seconds=row["avg_resolution_time_seconds"],
    )


class DailyTicketCount(BaseModel):
    date: str
    count: int


@router.get("/tickets-per-day", response_model=list[DailyTicketCount])
def get_tickets_per_day(
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = db.execute(text("SELECT * FROM get_tickets_per_day(30)")).mappings().all()
    return [DailyTicketCount(date=row["day"].isoformat(), count=row["count"]) for row in rows]
