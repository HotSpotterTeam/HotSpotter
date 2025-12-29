from alembic import op
import sqlalchemy as sa

"""added columns to http-logs table"""

revision = '7376b638cfeb'
down_revision = 'f5beac9c6b95'
branch_labels = None
depends_on = None



def upgrade() -> None:
    # Add columns if they don't already exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c["name"] for c in inspector.get_columns("http-logs")]

    if "response_status_code" not in existing_cols:
        op.add_column(
            "http-logs",
            sa.Column("response_status_code", sa.Integer(), nullable=True),
        )

    if "response_data" not in existing_cols:
        op.add_column(
            "http-logs",
            sa.Column("response_data", sa.String(), nullable=True),
        )

    if "end_time" not in existing_cols:
        op.add_column(
            "http-logs",
            sa.Column("end_time", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    # Drop the columns if they exist (safe rollback)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c["name"] for c in inspector.get_columns("http-logs")]

    if "response_status_code" in existing_cols:
        op.drop_column("http-logs", "response_status_code")

    if "response_data" in existing_cols:
        op.drop_column("http-logs", "response_data")

    if "end_time" in existing_cols:
        op.drop_column("http-logs", "end_time")

