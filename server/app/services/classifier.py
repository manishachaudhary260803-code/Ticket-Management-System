import logging
import os

import httpx

from app.database import SessionLocal
from app.models.ticket import Category, Ticket

logger = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:3001")

_CATEGORY_VALUES = {c.value for c in Category}


async def classify_ticket(ticket_id: str, subject: str, body: str) -> None:
    """Classify a ticket via the auth service's GPT endpoint and persist the result.

    Fire-and-forget: called out-of-band from ticket creation, never raises, and
    leaves the ticket's existing category untouched on any failure.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/api/auth/ai/classify",
                json={"ticket_subject": subject, "ticket_body": body},
            )
            resp.raise_for_status()
            category = resp.json().get("category")
    except Exception:
        logger.exception("Ticket classification request failed for ticket %s", ticket_id)
        return

    if category not in _CATEGORY_VALUES:
        logger.warning("Classifier returned unrecognized category %r for ticket %s", category, ticket_id)
        return

    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if ticket is None:
            return
        ticket.category = Category(category)
        db.commit()
    except Exception:
        logger.exception("Failed to persist classification for ticket %s", ticket_id)
        db.rollback()
    finally:
        db.close()
