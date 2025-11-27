from alembic import op
import sqlalchemy as sa

"""add postgis extention to postgres"""

revision = "7dde98462458"
down_revision = "e1a8138c9356"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS postgis;")
