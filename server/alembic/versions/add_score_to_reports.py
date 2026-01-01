"""add score to reports

Revision ID: add_score_to_reports
Revises: b8f3da3500e6
Create Date: 2026-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_score_to_reports'
down_revision = 'b8f3da3500e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add score column to reports table
    op.add_column('reports', sa.Column('score', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove score column from reports table
    op.drop_column('reports', 'score')
