"""dashboard stats stored functions

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-02
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE FUNCTION get_dashboard_stats()
        RETURNS TABLE (
            total_tickets bigint,
            open_tickets bigint,
            resolved_by_ai_count bigint,
            resolved_by_ai_percent numeric,
            avg_resolution_time_seconds double precision
        )
        LANGUAGE sql
        STABLE
        AS $$
            SELECT
                count(*) AS total_tickets,
                count(*) FILTER (WHERE status = 'open') AS open_tickets,
                count(*) FILTER (WHERE resolved_by_ai) AS resolved_by_ai_count,
                CASE WHEN count(*) = 0 THEN 0
                     ELSE round((count(*) FILTER (WHERE resolved_by_ai))::numeric / count(*) * 100, 1)
                END AS resolved_by_ai_percent,
                avg(extract(epoch FROM (resolved_at - created_at))) FILTER (WHERE resolved_at IS NOT NULL)
                    AS avg_resolution_time_seconds
            FROM tickets;
        $$;
        """
    )

    op.execute(
        """
        CREATE FUNCTION get_tickets_per_day(num_days integer DEFAULT 30)
        RETURNS TABLE (
            day date,
            count bigint
        )
        LANGUAGE sql
        STABLE
        AS $$
            SELECT
                gs.day,
                count(t.id)
            FROM generate_series(
                (now() AT TIME ZONE 'UTC')::date - (num_days - 1),
                (now() AT TIME ZONE 'UTC')::date,
                interval '1 day'
            ) AS gs(day)
            LEFT JOIN tickets t ON (t.created_at AT TIME ZONE 'UTC')::date = gs.day
            GROUP BY gs.day
            ORDER BY gs.day;
        $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS get_tickets_per_day(integer)")
    op.execute("DROP FUNCTION IF EXISTS get_dashboard_stats()")
