from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import Inspector

"""added user_action_logs table"""

revision = 'b8f3da3500e6'
down_revision = '7376b638cfeb'
branch_labels = None
depends_on = None



# Only create table if it doesn't exist


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if 'user-action-logs' not in tables:
        op.create_table(
            'user-action-logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_name', sa.String(), nullable=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('user_role', sa.String(), nullable=True),
            sa.Column('timestamp', sa.DateTime(), nullable=True),
            sa.Column('request_session_id', sa.String(), sa.ForeignKey('http-logs.id'), nullable=False), 
            sa.Column('data', sa.String(), nullable=True),
            sa.Column('action', sa.String(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    op.drop_table('user-action-logs')


