from alembic import op
import sqlalchemy as sa

"""added google_oauth"""

revision = '027c462cc602'
down_revision = 'e1a8138c9356'
branch_labels = None
depends_on = None


def upgrade():
    # Make username and password nullable for Google OAuth users
    op.alter_column('users', 'username',
                    existing_type=sa.String(),
                    nullable=True)
    op.alter_column('users', 'password',
                    existing_type=sa.String(),
                    nullable=True)

    # Add Google OAuth specific columns
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('picture', sa.String(), nullable=True))

    # Add unique constraint on google_id
    op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])


def downgrade():
    # Remove unique constraint
    op.drop_constraint('uq_users_google_id', 'users', type_='unique')

    # Remove Google OAuth columns
    op.drop_column('users', 'picture')
    op.drop_column('users', 'name')
    op.drop_column('users', 'google_id')

    # Make username and password NOT NULL again
    op.alter_column('users', 'password',
                    existing_type=sa.String(),
                    nullable=False)
    op.alter_column('users', 'username',
                    existing_type=sa.String(),
                    nullable=False)


