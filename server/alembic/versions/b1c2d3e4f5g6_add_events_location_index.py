"""add events location gist index

Revision ID: b1c2d3e4f5g6
Revises: add_performance_indexes
Create Date: 2026-02-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5g6'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    # Get existing indexes on events table
    events_indexes = [idx['name'] for idx in inspector.get_indexes('events')] if 'events' in inspector.get_table_names() else []

    # Add GIST spatial index on events.location for faster geo queries
    if 'idx_events_location' not in events_indexes:
        op.create_index('idx_events_location', 'events', ['location'], postgresql_using='gist')
        print("Created index: idx_events_location (GIST spatial index)")


def downgrade() -> None:
    try:
        op.drop_index('idx_events_location', table_name='events')
    except Exception as e:
        print(f"Warning: Could not drop index idx_events_location: {e}")
