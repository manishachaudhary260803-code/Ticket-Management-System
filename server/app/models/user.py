import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, String, Enum, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Role(str, enum.Enum):
    admin = "admin"
    agent = "agent"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    name = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False, default=Role.agent)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    tickets = relationship("Ticket", back_populates="assignee")
    sessions = relationship("Session", back_populates="user")
    replies = relationship("TicketReply", back_populates="author")
