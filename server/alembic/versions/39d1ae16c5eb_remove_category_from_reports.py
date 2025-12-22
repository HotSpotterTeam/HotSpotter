from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

"""remove category from reports"""

revision = '39d1ae16c5eb'
down_revision = '551f71d33a4c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    # Get existing columns
    reports_columns = [col['name'] for col in inspector.get_columns('reports')]
    events_columns = [col['name'] for col in inspector.get_columns('events')]
    
    # Drop category from reports if it exists
    if 'category' in reports_columns:
        op.drop_column('reports', 'category')
    
    # Add new columns to reports if they don't exist
    if 'is_flagged' not in reports_columns:
        op.add_column('reports', sa.Column('is_flagged', sa.Boolean(), server_default='false', nullable=True))
    if 'picture' not in reports_columns:
        op.add_column('reports', sa.Column('picture', sa.String(), nullable=True))
    if 'spot_id' not in reports_columns:
        op.add_column('reports', sa.Column('spot_id', sa.Integer(), nullable=True))
    
    # Add duration_hours to events if it doesn't exist
    if 'duration_hours' not in events_columns:
        op.add_column('events', sa.Column('duration_hours', sa.Integer(), server_default='24', nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    reports_columns = [col['name'] for col in inspector.get_columns('reports')]
    events_columns = [col['name'] for col in inspector.get_columns('events')]
    
    # Reverse operations - only if columns exist/don't exist
    if 'category' not in reports_columns:
        op.add_column('reports', sa.Column('category', sa.VARCHAR(), autoincrement=False, nullable=True))
    
    if 'is_flagged' in reports_columns:
        op.drop_column('reports', 'is_flagged')
    if 'picture' in reports_columns:
        op.drop_column('reports', 'picture')
    if 'spot_id' in reports_columns:
        op.drop_column('reports', 'spot_id')
    
    if 'duration_hours' in events_columns:
        op.drop_column('events', 'duration_hours')
