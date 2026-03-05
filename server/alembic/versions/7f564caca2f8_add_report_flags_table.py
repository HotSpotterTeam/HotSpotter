from alembic import op
import sqlalchemy as sa

"""add_report_flags_table"""

revision = '7f564caca2f8'
down_revision = 'a29708b7fc85'
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = inspector.get_indexes(table_name)
    return any(idx["name"] == index_name for idx in indexes)



def upgrade() -> None:
    # 1. Create the new report_flags table
    if not _table_exists('report_flags'):
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
    index_name = op.f('ix_report_flags_id')
    if _table_exists('report_flags') and not _index_exists('report_flags', index_name):
        op.create_index(index_name, 'report_flags', ['id'], unique=False)

    if not _column_exists('spots', 'external_link'):
        op.add_column('spots', sa.Column('external_link', sa.String(), nullable=True))
    if not _column_exists('events', 'external_link'):
        op.add_column('events', sa.Column('external_link', sa.String(), nullable=True))


def downgrade() -> None:
    # Undo the changes above
    index_name = op.f('ix_report_flags_id')
    if _table_exists('report_flags') and _index_exists('report_flags', index_name):
        op.drop_index(index_name, table_name='report_flags')
    if _table_exists('report_flags'):
        op.drop_table('report_flags')

    if _column_exists('events', 'external_link'):
        op.drop_column('events', 'external_link')
    if _column_exists('spots', 'external_link'):
        op.drop_column('spots', 'external_link')