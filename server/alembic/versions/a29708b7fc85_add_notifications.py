from alembic import op
import sqlalchemy as sa

"""add_notifications"""

revision = 'a29708b7fc85'
down_revision = 'c9d4e8f2a7b3'
branch_labels = None
depends_on = None


def upgrade():
    # Create notifications table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
                CREATE TABLE notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    notification_type VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    related_id INTEGER,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX idx_notifications_user_id ON notifications(user_id);
                CREATE INDEX idx_notifications_is_read ON notifications(is_read);
                CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
            END IF;
        END
        $$;
    """)


def downgrade():
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
                DROP TABLE notifications CASCADE;
            END IF;
        END
        $$;
    """)

