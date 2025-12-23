from alembic import op
import sqlalchemy as sa

"""Add temporary spots and event start/end times Validation"""

revision = '5ea4a0bded48'
down_revision = '39d1ae16c5eb'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns
    op.add_column('events', sa.Column('start_time', sa.DateTime(), nullable=True))
    op.add_column('events', sa.Column('end_time', sa.DateTime(), nullable=True))

    # Migrate existing data: combine date + time into start_time
    # For end_time, add duration_hours to start_time
    op.execute("""
        UPDATE events 
        SET start_time = (date + time)::timestamp
        WHERE date IS NOT NULL AND time IS NOT NULL
    """)

    op.execute("""
        UPDATE events 
        SET end_time = (start_time + (duration_hours || ' hours')::interval)
        WHERE start_time IS NOT NULL AND duration_hours IS NOT NULL
    """)

    # Make columns non-nullable after migration
    op.alter_column('events', 'start_time', nullable=False)
    op.alter_column('events', 'end_time', nullable=False)

    # Drop old columns
    op.drop_column('events', 'duration_hours')
    op.drop_column('events', 'time')
    op.drop_column('events', 'date')


def downgrade():
    # Add back old columns
    op.add_column('events', sa.Column('date', sa.DateTime(), nullable=True))
    op.add_column('events', sa.Column('time', sa.Time(), nullable=True))
    op.add_column('events', sa.Column('duration_hours', sa.Integer(), nullable=True))

    # Migrate data back
    op.execute("""
        UPDATE events 
        SET date = start_time::date,
            time = start_time::time,
            duration_hours = EXTRACT(EPOCH FROM (end_time - start_time))/3600
        WHERE start_time IS NOT NULL AND end_time IS NOT NULL
    """)

    # Drop new columns
    op.drop_column('events', 'end_time')
    op.drop_column('events', 'start_time')


