import asyncio

from fastapi import APIRouter, Depends

from app.auth import require_admin
from app.models.user import User
from app.services.email_ingestor import poll_mailbox

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/poll")
async def trigger_poll(current_user: User = Depends(require_admin)):
    """Manually trigger an IMAP poll. Admin only."""
    count = await asyncio.to_thread(poll_mailbox)
    return {"created": count}
