from sqlalchemy.orm import Session as DBSession

from app.models.user import User

# Must match AI_AGENT_EMAIL in auth/src/seed.ts.
AI_AGENT_EMAIL = "ai-agent@codewithme.internal"


def get_ai_agent_id(db: DBSession) -> str | None:
    agent = db.query(User).filter(User.email == AI_AGENT_EMAIL, User.deleted_at.is_(None)).first()
    return agent.id if agent else None
