from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.engine.reflection import Inspector

"""create spots table"""

revision = '551f71d33a4c'
down_revision = 'aed5cf898706'  # Points to is_admin migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    
    # Only create table if it doesn't exist
    if 'spots' not in tables:
        op.create_table(
            'spots',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('location', Geometry(geometry_type='POINT', srid=4326), nullable=False),
            sa.Column('category', sa.String(), nullable=False),
            sa.Column('owner_id', sa.Integer(), nullable=False),
            sa.Column('is_approved', sa.Boolean(), server_default='false', nullable=False),
            sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('idx_spots_location', 'spots', ['location'], postgresql_using='gist')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    
    if 'spots' in tables:
        op.drop_index('idx_spots_location', table_name='spots')
        op.drop_table('spots')