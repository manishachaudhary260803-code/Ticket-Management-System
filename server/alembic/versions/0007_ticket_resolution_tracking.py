"""ticket resolution tracking

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "tickets",
        sa.Column("resolved_by_ai", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute("UPDATE tickets SET resolved_at = updated_at WHERE status = 'resolved'")
    op.execute(
        """
        UPDATE tickets t SET resolved_by_ai = true
        WHERE t.status = 'resolved'
        AND EXISTS (
            SELECT 1 FROM ticket_replies r
            WHERE r.ticket_id = t.id AND r.sender_type = 'agent' AND r.author_id IS NULL
        )
        """
    )


def downgrade() -> None:
    op.drop_column("tickets", "resolved_by_ai")
    op.drop_column("tickets", "resolved_at")
