import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Category(str, enum.Enum):
    technical_it = "technical_it"
    billing_fees = "billing_fees"
    other = "other"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), nullable=False, default=TicketStatus.open)
    priority = Column(Enum(Priority), nullable=False, default=Priority.medium)
    category = Column(Enum(Category), nullable=False, default=Category.other)
    from_email = Column(String, nullable=False)
    from_name = Column(String)
    thread_id = Column(String, index=True)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    ai_summary = Column(Text)
    ai_draft_reply = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    assignee = relationship("User", back_populates="tickets")
