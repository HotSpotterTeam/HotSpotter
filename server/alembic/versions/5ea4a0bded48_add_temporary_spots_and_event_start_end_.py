from alembic import op
import sqlalchemy as sa

"""Add temporary spots and event start/end times Validation"""

revision = '5ea4a0bded48'
down_revision = '39d1ae16c5eb'
branch_labels = None
depends_on = None


def upgrade():
    # Ensure spot_id column exists (may already exist from previous migration)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'spot_id'
            ) THEN
                ALTER TABLE events ADD COLUMN spot_id INTEGER REFERENCES spots(id);
            END IF;
        END $$;
    """)

    # Add new time columns as nullable first (only if they don't exist)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'start_time'
            ) THEN
                ALTER TABLE events ADD COLUMN start_time TIMESTAMP;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'end_time'
            ) THEN
                ALTER TABLE events ADD COLUMN end_time TIMESTAMP;
            END IF;
        END $$;
    """)

    # Migrate existing data if old columns exist
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'date'
            ) THEN
                UPDATE events 
                SET start_time = (date + time)::timestamp
                WHERE start_time IS NULL AND date IS NOT NULL AND time IS NOT NULL;

                UPDATE events 
                SET end_time = (start_time + (duration_hours || ' hours')::interval)
                WHERE end_time IS NULL AND start_time IS NOT NULL AND duration_hours IS NOT NULL;
            END IF;
        END $$;
    """)

    # Make columns non-nullable
    op.alter_column('events', 'start_time', nullable=False)
    op.alter_column('events', 'end_time', nullable=False)

    # Drop old columns if they exist
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'duration_hours'
            ) THEN
                ALTER TABLE events DROP COLUMN duration_hours;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'time'
            ) THEN
                ALTER TABLE events DROP COLUMN time;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'events' AND column_name = 'date'
            ) THEN
                ALTER TABLE events DROP COLUMN date;
            END IF;
        END $$;
    """)


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









