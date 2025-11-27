from alembic import op
from app.models import Base

revision = "e1a8138c9356"
down_revision = "7dde98462458"
branch_labels = None
depends_on = None
"""create db"""


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
