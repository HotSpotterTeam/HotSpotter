"""add performance indexes

Revision ID: add_performance_indexes
Revises: 7f564caca2f8
Create Date: 2026-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = '7f564caca2f8'  # Latest head: add_report_flags_table
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    # Get existing indexes
    reports_indexes = [idx['name'] for idx in inspector.get_indexes('reports')] if 'reports' in inspector.get_table_names() else []
    events_indexes = [idx['name'] for idx in inspector.get_indexes('events')] if 'events' in inspector.get_table_names() else []
    spots_indexes = [idx['name'] for idx in inspector.get_indexes('spots')] if 'spots' in inspector.get_table_names() else []
    
    # ===== REPORTS TABLE INDEXES =====
    # Critical for trending score queries - filtering by date and spot_id/event_id
    if 'idx_reports_date' not in reports_indexes:
        op.create_index('idx_reports_date', 'reports', ['date'], postgresql_where=sa.text('date IS NOT NULL'))
        print("Created index: idx_reports_date")
    
    if 'idx_reports_spot_id' not in reports_indexes:
        op.create_index('idx_reports_spot_id', 'reports', ['spot_id'], postgresql_where=sa.text('spot_id IS NOT NULL'))
        print("Created index: idx_reports_spot_id")
    
    if 'idx_reports_event_id' not in reports_indexes:
        op.create_index('idx_reports_event_id', 'reports', ['event_id'], postgresql_where=sa.text('event_id IS NOT NULL'))
        print("Created index: idx_reports_event_id")
    
    # Composite index for trending queries: spot_id + date (most common query pattern)
    if 'idx_reports_spot_date' not in reports_indexes:
        op.create_index('idx_reports_spot_date', 'reports', ['spot_id', 'date'], postgresql_where=sa.text('spot_id IS NOT NULL'))
        print("Created index: idx_reports_spot_date")
    
    # Composite index for trending queries: event_id + date
    if 'idx_reports_event_date' not in reports_indexes:
        op.create_index('idx_reports_event_date', 'reports', ['event_id', 'date'], postgresql_where=sa.text('event_id IS NOT NULL'))
        print("Created index: idx_reports_event_date")
    
    # Index for score (used in AVG calculations)
    if 'idx_reports_score' not in reports_indexes:
        op.create_index('idx_reports_score', 'reports', ['score'], postgresql_where=sa.text('score IS NOT NULL'))
        print("Created index: idx_reports_score")
    
    # ===== EVENTS TABLE INDEXES =====
    # Critical for filtering active events and finding events at spots
    if 'idx_events_status' not in events_indexes:
        op.create_index('idx_events_status', 'events', ['status'])
        print("Created index: idx_events_status")
    
    if 'idx_events_spot_id' not in events_indexes:
        op.create_index('idx_events_spot_id', 'events', ['spot_id'], postgresql_where=sa.text('spot_id IS NOT NULL'))
        print("Created index: idx_events_spot_id")
    
    # Composite index for finding active events at spots (common query)
    if 'idx_events_spot_status' not in events_indexes:
        op.create_index('idx_events_spot_status', 'events', ['spot_id', 'status'], postgresql_where=sa.text('spot_id IS NOT NULL'))
        print("Created index: idx_events_spot_status")
    
    # Index for start_time (used in event timing queries)
    if 'idx_events_start_time' not in events_indexes:
        op.create_index('idx_events_start_time', 'events', ['start_time'], postgresql_where=sa.text('start_time IS NOT NULL'))
        print("Created index: idx_events_start_time")
    
    # ===== SPOTS TABLE INDEXES =====
    # Critical for filtering approved spots
    if 'idx_spots_is_approved' not in spots_indexes:
        op.create_index('idx_spots_is_approved', 'spots', ['is_approved'])
        print("Created index: idx_spots_is_approved")
    
    # Index for category filtering
    if 'idx_spots_category' not in spots_indexes:
        op.create_index('idx_spots_category', 'spots', ['category'])
        print("Created index: idx_spots_category")
    
    # Composite index for common filter: is_approved + category
    if 'idx_spots_approved_category' not in spots_indexes:
        op.create_index('idx_spots_approved_category', 'spots', ['is_approved', 'category'])
        print("Created index: idx_spots_approved_category")


def downgrade() -> None:
    # Drop all indexes created in upgrade
    indexes_to_drop = [
        'idx_reports_date',
        'idx_reports_spot_id',
        'idx_reports_event_id',
        'idx_reports_spot_date',
        'idx_reports_event_date',
        'idx_reports_score',
        'idx_events_status',
        'idx_events_spot_id',
        'idx_events_spot_status',
        'idx_events_start_time',
        'idx_spots_is_approved',
        'idx_spots_category',
        'idx_spots_approved_category',
    ]
    
    for index_name in indexes_to_drop:
        try:
            # Try to determine which table the index belongs to
            if 'reports' in index_name:
                op.drop_index(index_name, table_name='reports')
            elif 'events' in index_name:
                op.drop_index(index_name, table_name='events')
            elif 'spots' in index_name:
                op.drop_index(index_name, table_name='spots')
        except Exception as e:
            print(f"Warning: Could not drop index {index_name}: {e}")
