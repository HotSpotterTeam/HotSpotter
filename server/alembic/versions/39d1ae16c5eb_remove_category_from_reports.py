from alembic import op
import sqlalchemy as sa

"""remove category from reports"""

revision = '39d1ae16c5eb'
down_revision = 'aed5cf898706'
branch_labels = None
depends_on = None



def upgrade() -> None:
    op.drop_column('reports', 'category')
    op.add_column('reports', sa.Column('is_flagged', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('reports', sa.Column('picture', sa.String(), nullable=True))
    op.add_column('reports', sa.Column('spot_id', sa.Integer(), nullable=True))
    op.add_column('events', sa.Column('duration_hours', sa.Integer(), server_default='24', nullable=True))


def downgrade() -> None:
    op.add_column('reports', sa.Column('category', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_column('reports', 'is_flagged')
    op.drop_column('reports', 'picture')
    op.drop_column('events', 'duration_hours')
    op.drop_column('reports', 'spot_id')
