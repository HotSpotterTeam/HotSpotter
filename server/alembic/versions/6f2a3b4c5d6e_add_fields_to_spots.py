from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector

"""add missing spot fields"""

revision = '6f2a3b4c5d6e'
down_revision = '5ea4a0bded48'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('spots')]
    
    # Add address
    if 'address' not in columns:
        op.add_column('spots', sa.Column('address', sa.String(), nullable=True))
    
    # Add permanence fields
    if 'spot_type' not in columns:
        op.add_column('spots', sa.Column('spot_type', sa.String(20), nullable=False, server_default='permanent'))
    if 'permanence_reason' not in columns:
        op.add_column('spots', sa.Column('permanence_reason', sa.String(), nullable=True))
    
    # Add source tracking
    if 'source' not in columns:
        op.add_column('spots', sa.Column('source', sa.String(20), nullable=False, server_default='user_created'))
    if 'osm_id' not in columns:
        op.add_column('spots', sa.Column('osm_id', sa.String(255), nullable=True))
    if 'osm_data' not in columns:
        op.add_column('spots', sa.Column('osm_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # Add timestamp fields
    if 'expires_at' not in columns:
        op.add_column('spots', sa.Column('expires_at', sa.DateTime(), nullable=True))
    if 'created_at' not in columns:
        op.add_column('spots', sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))
    if 'updated_at' not in columns:
        op.add_column('spots', sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))
    if 'last_activity' not in columns:
        op.add_column('spots', sa.Column('last_activity', sa.DateTime(), nullable=True))
    
    # Create GIST index for spatial queries (non-unique)
    indexes = inspector.get_indexes('spots')
    index_names = [idx['name'] for idx in indexes]
    if 'idx_spots_location' not in index_names:
        op.create_index('idx_spots_location', 'spots', ['location'], postgresql_using='gist')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('spots')]
    
    # Drop GIST index
    indexes = inspector.get_indexes('spots')
    index_names = [idx['name'] for idx in indexes]
    if 'idx_spots_location' in index_names:
        op.drop_index('idx_spots_location', table_name='spots')
    
    # Remove added fields
    if 'last_activity' in columns:
        op.drop_column('spots', 'last_activity')
    if 'updated_at' in columns:
        op.drop_column('spots', 'updated_at')
    if 'created_at' in columns:
        op.drop_column('spots', 'created_at')
    if 'expires_at' in columns:
        op.drop_column('spots', 'expires_at')
    
    # Remove OSM fields
    if 'osm_data' in columns:
        op.drop_column('spots', 'osm_data')
    if 'osm_id' in columns:
        op.drop_column('spots', 'osm_id')
    if 'source' in columns:
        op.drop_column('spots', 'source')
    
    # Remove permanence fields
    if 'permanence_reason' in columns:
        op.drop_column('spots', 'permanence_reason')
    if 'spot_type' in columns:
        op.drop_column('spots', 'spot_type')
    
    # Remove address
    if 'address' in columns:
        op.drop_column('spots', 'address')