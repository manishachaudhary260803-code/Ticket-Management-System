from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user
from app.database import get_db
from app.models.ticket import Category, Priority, SenderType, Ticket, TicketReply, TicketStatus
from app.models.user import User
from app.utils.email import send_email

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
    ai_summary: str | None
    ai_draft_reply: str | None
    resolved_at: datetime | None
    resolved_by_ai: bool
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


class TicketUpdate(BaseModel):
    status: TicketStatus | None = None
    category: Category | None = None


@router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: str,
    body: TicketUpdate,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if body.status is not None:
        if body.status == TicketStatus.resolved and ticket.status != TicketStatus.resolved:
            ticket.resolved_at = datetime.now(timezone.utc)
            ticket.resolved_by_ai = False
        elif body.status != TicketStatus.resolved and ticket.status == TicketStatus.resolved:
            ticket.resolved_at = None
            ticket.resolved_by_ai = False
        ticket.status = body.status
    if body.category is not None:
        ticket.category = body.category
    db.commit()
    db.refresh(ticket)
    return ticket


class TicketAssign(BaseModel):
    assignee_id: str | None


@router.patch("/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: str,
    body: TicketAssign,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    assignee = None
    if body.assignee_id is not None:
        assignee = (
            db.query(User)
            .filter(User.id == body.assignee_id, User.deleted_at == None)
            .first()
        )
        if not assignee:
            raise HTTPException(status_code=400, detail="assignee_id must be a valid user")
    notify = assignee is not None and body.assignee_id != ticket.assignee_id
    ticket.assignee_id = body.assignee_id
    db.commit()
    db.refresh(ticket)
    if notify:
        background_tasks.add_task(
            send_email,
            to=assignee.email,
            subject=f"Ticket assigned: {ticket.subject}",
            body=(
                f"You've been assigned a ticket from {ticket.from_name or ticket.from_email}.\n\n"
                f"Subject: {ticket.subject}\n\n{ticket.body}"
            ),
        )
    return ticket


class ReplyAuthorOut(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class ReplyOut(BaseModel):
    id: str
    ticket_id: str
    sender_type: SenderType
    author: ReplyAuthorOut | None
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReplyCreate(BaseModel):
    body: str


@router.get("/{ticket_id}/replies", response_model=list[ReplyOut])
def list_replies(
    ticket_id: str,
    db: DBSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket.replies


@router.post("/{ticket_id}/replies", response_model=ReplyOut, status_code=201)
def create_reply(
    ticket_id: str,
    body: ReplyCreate,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.body.strip():
        raise HTTPException(status_code=422, detail="Reply body cannot be empty")
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    reply = TicketReply(
        ticket_id=ticket_id,
        author_id=user.id,
        body=body.body,
        sender_type=SenderType.agent,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    background_tasks.add_task(
        send_email,
        to=ticket.from_email,
        subject=f"Re: {ticket.subject}",
        body=body.body,
    )
    return reply
