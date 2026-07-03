import logging
import os

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "")


def send_email(to: str, subject: str, body: str, body_html: str | None = None) -> None:
    """Send an email via SendGrid. Never raises — logs and returns on failure."""
    if not SENDGRID_API_KEY or not SENDGRID_FROM_EMAIL:
        logger.warning("SendGrid not configured — skipping email to %s", to)
        return

    message = Mail(
        from_email=SENDGRID_FROM_EMAIL,
        to_emails=to,
        subject=subject,
        plain_text_content=body,
        html_content=body_html or body,
    )
    try:
        SendGridAPIClient(SENDGRID_API_KEY).send(message)
    except Exception:
        logger.exception("Failed to send email to %s", to)
