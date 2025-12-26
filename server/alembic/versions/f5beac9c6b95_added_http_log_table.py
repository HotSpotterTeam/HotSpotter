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
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('request-id', sa.String(), nullable=True),
            sa.Column('source-url', sa.String(), nullable=True),
            sa.Column('dest-url', sa.String(), nullable=True),
            sa.Column('action', sa.String(), nullable=True),
            sa.Column('headers', sa.JSON(), nullable=True),
            sa.Column('params', sa.JSON(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    op.drop_table('http-logs')


