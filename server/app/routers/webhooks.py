import os
import re
import uuid
from email.utils import parseaddr

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, BackgroundTasks, Depends, Form, Header, HTTPException, Query
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.ticket import Category, Priority, SenderType, Ticket, TicketReply, TicketStatus
from app.services.ai_agent import get_ai_agent_id
from app.services.classifier import classify_ticket
from app.utils.html import strip_html

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")

_SUBJECT_PREFIX_RE = re.compile(r"^(re|fwd|fw)\s*:\s*", re.IGNORECASE)


def _verify_secret(x_webhook_secret: str | None = Header(default=None)) -> None:
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook endpoint is not configured")
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


def _verify_secret_header_or_query(
    x_webhook_secret: str | None = Header(default=None),
    secret: str | None = Query(default=None),
) -> None:
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook endpoint is not configured")
    if WEBHOOK_SECRET not in (x_webhook_secret, secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


def _strip_subject_prefixes(subject: str) -> str:
    """Strip repeated leading Re:/Fwd: prefixes, preserving remaining case."""
    s = subject.strip()
    while True:
        stripped = _SUBJECT_PREFIX_RE.sub("", s).strip()
        if stripped == s:
            return s
        s = stripped


class WebhookTicketIn(BaseModel):
    subject: str
    body: str
    from_email: EmailStr
    from_name: str | None = None
    priority: Priority = Priority.low
    category: Category = Category.other

    @field_validator("subject", "body")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v


class WebhookTicketOut(BaseModel):
    id: str
    subject: str
    status: str
    priority: str
    category: str
    from_email: str
    from_name: str | None

    class Config:
        from_attributes = True


@router.post("/ticket", response_model=WebhookTicketOut, status_code=201)
def create_ticket_via_webhook(
    payload: WebhookTicketIn,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    _: None = Depends(_verify_secret),
):
    ticket = Ticket(
        id=str(uuid.uuid4()),
        subject=payload.subject,
        body=payload.body,
        from_email=str(payload.from_email),
        from_name=payload.from_name,
        thread_id=str(uuid.uuid4()),
        status=TicketStatus.open,
        priority=payload.priority,
        category=payload.category,
        assignee_id=get_ai_agent_id(db),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    background_tasks.add_task(classify_ticket, ticket.id, ticket.subject, ticket.body, ticket.from_name)
    return ticket


@router.post("/inbound-email", response_model=WebhookTicketOut, status_code=201)
def inbound_email(
    background_tasks: BackgroundTasks,
    to: str = Form(...),
    from_: str = Form(..., alias="from"),
    subject: str = Form(default=""),
    text: str = Form(default=""),
    html: str = Form(default=""),
    db: DBSession = Depends(get_db),
    _: None = Depends(_verify_secret_header_or_query),
):
    from_name, from_email = parseaddr(from_)
    if not from_email:
        raise HTTPException(status_code=422, detail="Could not parse sender email from 'from' field")
    try:
        from_email = validate_email(from_email, check_deliverability=False).normalized
    except EmailNotValidError:
        raise HTTPException(status_code=422, detail="'from' field did not contain a valid email address")
    from_name = from_name or from_email

    clean_subject = _strip_subject_prefixes(subject) or "(no subject)"
    body = text.strip() or strip_html(html).strip()

    open_tickets = (
        db.query(Ticket)
        .filter(Ticket.from_email == from_email, Ticket.status != TicketStatus.resolved)
        .all()
    )
    match = next(
        (t for t in open_tickets if _strip_subject_prefixes(t.subject).lower() == clean_subject.lower()),
        None,
    )

    if match:
        reply = TicketReply(
            ticket_id=match.id,
            body=body,
            sender_type=SenderType.customer,
        )
        db.add(reply)
        db.commit()
        db.refresh(match)
        return match

    ticket = Ticket(
        id=str(uuid.uuid4()),
        subject=clean_subject,
        body=body,
        from_email=from_email,
        from_name=from_name,
        thread_id=str(uuid.uuid4()),
        status=TicketStatus.open,
        priority=Priority.low,
        category=Category.other,
        assignee_id=get_ai_agent_id(db),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    background_tasks.add_task(classify_ticket, ticket.id, ticket.subject, ticket.body, ticket.from_name)
    return ticket
