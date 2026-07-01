import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.ticket import Category, Priority, Ticket, TicketStatus
from app.services.classifier import classify_ticket

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")


def _verify_secret(x_webhook_secret: str | None = Header(default=None)) -> None:
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook endpoint is not configured")
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


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
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    background_tasks.add_task(classify_ticket, ticket.id, ticket.subject, ticket.body, ticket.from_name)
    return ticket
