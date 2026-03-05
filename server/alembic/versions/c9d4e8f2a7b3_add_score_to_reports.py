"""add score to reports

Revision ID: c9d4e8f2a7b3
Revises: b8f3da3500e6
Create Date: 2026-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


# revision identifiers, used by Alembic.
revision = 'c9d4e8f2a7b3'
down_revision = 'b8f3da3500e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add score column to reports table
    if not _column_exists('reports', 'score'):
        op.add_column('reports', sa.Column('score', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove score column from reports table
    if _column_exists('reports', 'score'):
        op.drop_column('reports', 'score')
