from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


 
"""added-http-log-table"""

revision = 'f5beac9c6b95'
down_revision = '5ea4a0bded48'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    if 'http-logs' not in tables:
        op.create_table(
            'http-logs',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('start_time', sa.DateTime(), nullable=True),
            sa.Column('request_id', sa.String(), nullable=True),
            sa.Column('source_url', sa.String(), nullable=True),
            sa.Column('dest_url', sa.String(), nullable=True),
            sa.Column('action', sa.String(), nullable=True),
            sa.Column('headers', sa.JSON(), nullable=True),
            sa.Column('data', sa.JSON(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'http-logs' in tables:
        op.drop_table('http-logs')


