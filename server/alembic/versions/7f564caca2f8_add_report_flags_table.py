from alembic import op
import sqlalchemy as sa

"""add_report_flags_table"""

revision = '7f564caca2f8'
down_revision = 'a29708b7fc85'
branch_labels = None
depends_on = None



def upgrade() -> None:
    # 1. Create the new report_flags table
    op.create_table(
        'report_flags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # 2. Create the index for the ID column (for performance)
    op.create_index(op.f('ix_report_flags_id'), 'report_flags', ['id'], unique=False)

    op.add_column('spots', sa.Column('external_link', sa.String(), nullable=True))
    op.add_column('events', sa.Column('external_link', sa.String(), nullable=True))


def downgrade() -> None:
    # Undo the changes above
    op.drop_index(op.f('ix_report_flags_id'), table_name='report_flags')
    op.drop_table('report_flags')

    op.drop_column('events', 'external_link')
    op.drop_column('spots', 'external_link')