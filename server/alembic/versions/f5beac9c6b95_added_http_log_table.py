from alembic import op
import sqlalchemy as sa

"""added-http-log-table"""

revision = 'f5beac9c6b95'
down_revision = '39d1ae16c5eb'
branch_labels = None
depends_on = None

def upgrade() -> None:
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


