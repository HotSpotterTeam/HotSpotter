from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

"""added google_oauth"""

revision = '027c462cc602'
down_revision = 'e1a8138c9356'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Make username and password nullable for Google OAuth users
    op.alter_column('users', 'username',
                    existing_type=sa.String(),
                    nullable=True)
    op.alter_column('users', 'password',
                    existing_type=sa.String(),
                    nullable=True)

    # Add Google OAuth specific columns only if they don't exist
    if 'google_id' not in columns:
        op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    
    if 'name' not in columns:
        op.add_column('users', sa.Column('name', sa.String(), nullable=True))
    
    if 'picture' not in columns:
        op.add_column('users', sa.Column('picture', sa.String(), nullable=True))

    # Add unique constraint on google_id if it doesn't exist
    constraints = [constraint['name'] for constraint in inspector.get_unique_constraints('users')]
    if 'uq_users_google_id' not in constraints:
        op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    # Remove unique constraint if it exists
    constraints = [constraint['name'] for constraint in inspector.get_unique_constraints('users')]
    if 'uq_users_google_id' in constraints:
        op.drop_constraint('uq_users_google_id', 'users', type_='unique')

    # Remove Google OAuth columns if they exist
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'picture' in columns:
        op.drop_column('users', 'picture')
    if 'name' in columns:
        op.drop_column('users', 'name')
    if 'google_id' in columns:
        op.drop_column('users', 'google_id')

    # Make username and password NOT NULL again
    op.alter_column('users', 'password',
                    existing_type=sa.String(),
                    nullable=False)
    op.alter_column('users', 'username',
                    existing_type=sa.String(),
                    nullable=False)


