from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.database import get_db
from app.models.ticket import Category, Priority, Ticket, TicketStatus
from app.models.user import User

_SORTABLE = {
    "subject": Ticket.subject,
    "status": Ticket.status,
    "priority": Ticket.priority,
    "category": Ticket.category,
    "created_at": Ticket.created_at,
}

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


class TicketOut(BaseModel):
    id: str
    subject: str
    body: str
    status: TicketStatus
    priority: Priority
    category: Category
    from_email: str
    from_name: str | None
    thread_id: str | None
    assignee_id: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedTickets(BaseModel):
    items: list[TicketOut]
    total: int
    page: int
    page_size: int


@router.get("", response_model=PaginatedTickets)
def list_tickets(
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
    sort_by: Literal["subject", "status", "priority", "category", "created_at"] = Query("created_at"),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    status: list[TicketStatus] = Query(default=[]),
    priority: list[Priority] = Query(default=[]),
    category: list[Category] = Query(default=[]),
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    col = _SORTABLE[sort_by]
    order = col.asc() if sort_dir == "asc" else col.desc()
    q = db.query(Ticket)
    if status:
        q = q.filter(Ticket.status.in_(status))
    if priority:
        q = q.filter(Ticket.priority.in_(priority))
    if category:
        q = q.filter(Ticket.category.in_(category))
    if search:
        q = q.filter(Ticket.subject.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedTickets(items=items, total=total, page=page, page_size=page_size)


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: str,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
