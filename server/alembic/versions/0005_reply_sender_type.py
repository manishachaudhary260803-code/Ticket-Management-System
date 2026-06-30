"""reply sender type

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE sendertype AS ENUM ('agent', 'customer')")
    op.add_column(
        "ticket_replies",
        sa.Column(
            "sender_type",
            sa.Enum("agent", "customer", name="sendertype"),
            nullable=False,
            server_default="agent",
        ),
    )
    op.alter_column("ticket_replies", "author_id", nullable=True)


def downgrade() -> None:
    op.alter_column("ticket_replies", "author_id", nullable=False)
    op.drop_column("ticket_replies", "sender_type")
    op.execute("DROP TYPE sendertype")
