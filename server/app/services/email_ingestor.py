import asyncio
import email as email_lib
import imaplib
import logging
import os
import uuid
from email.header import decode_header, make_header
from html.parser import HTMLParser

from app.database import SessionLocal
from app.models.ticket import Category, Priority, Ticket, TicketStatus
from app.services.classifier import classify_ticket

logger = logging.getLogger(__name__)

IMAP_HOST = os.getenv("IMAP_HOST", "")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_USER = os.getenv("IMAP_USER", "")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD", "")
POLL_INTERVAL = int(os.getenv("EMAIL_POLL_INTERVAL", "60"))


class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return " ".join(self._parts)


def _strip_html(html: str) -> str:
    s = _HTMLStripper()
    s.feed(html)
    return s.get_text()


def _decode_header_str(value: str | None) -> str:
    if not value:
        return ""
    return str(make_header(decode_header(value)))


def _extract_body(msg: email_lib.message.Message) -> str:
    """Return plain-text body, falling back to stripped HTML."""
    plain: str | None = None
    html: str | None = None

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if "attachment" in str(part.get("Content-Disposition", "")):
                continue
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            charset = part.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if ct == "text/plain" and plain is None:
                plain = text
            elif ct == "text/html" and html is None:
                html = text
    else:
        payload = msg.get_payload(decode=True)
        charset = msg.get_content_charset() or "utf-8"
        text = payload.decode(charset, errors="replace") if payload else ""
        if msg.get_content_type() == "text/html":
            html = text
        else:
            plain = text

    if plain is not None:
        return plain.strip()
    if html is not None:
        return _strip_html(html).strip()
    return ""


def poll_mailbox(loop: asyncio.AbstractEventLoop) -> int:
    """Fetch unseen IMAP messages and create tickets. Returns number of tickets created."""
    if not all([IMAP_HOST, IMAP_USER, IMAP_PASSWORD]):
        logger.warning("IMAP credentials not configured — skipping email poll")
        return 0

    created = 0
    db = SessionLocal()
    try:
        with imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT) as imap:
            imap.login(IMAP_USER, IMAP_PASSWORD)
            imap.select("INBOX")
            _, data = imap.search(None, "UNSEEN")
            uids = data[0].split() if data[0] else []

            for uid in uids:
                _, msg_data = imap.fetch(uid, "(RFC822)")
                if not msg_data or not msg_data[0]:
                    continue
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)

                message_id: str = msg.get("Message-ID", "").strip()
                in_reply_to: str = msg.get("In-Reply-To", "").strip()
                references: str = msg.get("References", "").strip()

                # Determine whether this is a reply to an existing thread
                thread_ref = in_reply_to or (references.split()[0] if references else "")
                if thread_ref:
                    existing = db.query(Ticket).filter(Ticket.thread_id == thread_ref).first()
                    if existing:
                        # Reply to an existing ticket — mark read and skip
                        imap.store(uid, "+FLAGS", "\\Seen")
                        continue

                # Deduplicate: skip if this Message-ID was already ingested
                if message_id:
                    duplicate = db.query(Ticket).filter(Ticket.thread_id == message_id).first()
                    if duplicate:
                        imap.store(uid, "+FLAGS", "\\Seen")
                        continue

                from_raw = msg.get("From", "")
                from_name_raw, from_email = email_lib.utils.parseaddr(from_raw)
                from_name = _decode_header_str(from_name_raw) or from_email
                subject = _decode_header_str(msg.get("Subject", "(no subject)"))
                body = _extract_body(msg)

                ticket = Ticket(
                    id=str(uuid.uuid4()),
                    subject=subject,
                    body=body,
                    from_email=from_email,
                    from_name=from_name,
                    thread_id=message_id or str(uuid.uuid4()),
                    status=TicketStatus.open,
                    priority=Priority.low,
                    category=Category.other,
                )
                db.add(ticket)
                db.commit()
                asyncio.run_coroutine_threadsafe(
                    classify_ticket(ticket.id, ticket.subject, ticket.body), loop
                )
                imap.store(uid, "+FLAGS", "\\Seen")
                created += 1
                logger.info("Ticket %s created from email '%s'", ticket.id, subject)

    except Exception:
        logger.exception("Error during mailbox poll")
        db.rollback()
    finally:
        db.close()

    return created


async def run_poller() -> None:
    """Background coroutine: polls the mailbox every POLL_INTERVAL seconds."""
    logger.info("Email poller started — interval %ds", POLL_INTERVAL)
    loop = asyncio.get_running_loop()
    while True:
        try:
            count = await asyncio.to_thread(poll_mailbox, loop)
            if count:
                logger.info("Email poll complete: %d ticket(s) created", count)
        except Exception:
            logger.exception("Email poller iteration error")
        await asyncio.sleep(POLL_INTERVAL)
