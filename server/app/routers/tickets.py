from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.database import get_db
from app.models.ticket import Category, Priority, Ticket, TicketStatus
from app.models.user import User

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


@router.get("", response_model=list[TicketOut])
def list_tickets(
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Ticket).order_by(Ticket.created_at.desc()).all()


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
