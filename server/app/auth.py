from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.session import Session
from app.models.user import User


def get_current_user(
    request: Request,
    db: DBSession = Depends(get_db),
) -> User:
    # Better Auth prefixes the cookie with "__Secure-" when served over HTTPS
    # (production), but not over plain http:// (local dev) — check both.
    token = request.cookies.get("__Secure-better-auth.session_token") or request.cookies.get(
        "better-auth.session_token"
    )
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Better Auth appends ".signature" to the cookie value; the DB stores only the token part
    token = token.split(".")[0]

    session = db.query(Session).filter(Session.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
