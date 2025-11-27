from alembic import op
from app.models import Base, User, Event, Report

revision = "e1a8138c9356"
down_revision = None
branch_labels = None
depends_on = None
"""create db"""


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
    op.drop_table(User.__table__)
    op.drop_table(Event.__table__)
    op.drop_table(Report.__table__)
