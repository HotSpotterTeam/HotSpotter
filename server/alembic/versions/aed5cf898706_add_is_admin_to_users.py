from alembic import op
import sqlalchemy as sa

"""add is_admin to users"""

revision = 'aed5cf898706'
down_revision = '027c462cc602'
branch_labels = None
depends_on = None



def upgrade() -> None:
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'is_admin')

