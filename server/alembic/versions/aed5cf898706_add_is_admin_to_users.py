from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

"""add is_admin to users"""

revision = 'aed5cf898706'
down_revision = '027c462cc602'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Only add is_admin column if it doesn't exist
    if 'is_admin' not in columns:
        op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Only drop is_admin column if it exists
    if 'is_admin' in columns:
        op.drop_column('users', 'is_admin')

