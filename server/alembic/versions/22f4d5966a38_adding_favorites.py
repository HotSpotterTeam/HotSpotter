from alembic import op
import sqlalchemy as sa

"""adding_favorites"""

revision = '22f4d5966a38'
down_revision = '6f2a3b4c5d6e'
branch_labels = None
depends_on = None


def upgrade():
    # Create spot_favorites table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spot_favorites') THEN
                CREATE TABLE spot_favorites (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    spot_id INTEGER NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    CONSTRAINT fk_spot_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT fk_spot_favorites_spot FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
                    CONSTRAINT unique_user_spot_favorite UNIQUE (user_id, spot_id)
                );

                CREATE INDEX idx_spot_favorites_user_id ON spot_favorites(user_id);
                CREATE INDEX idx_spot_favorites_spot_id ON spot_favorites(spot_id);
            END IF;
        END $$;
    """)

    # Create event_subscriptions table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_subscriptions') THEN
                CREATE TABLE event_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    event_id INTEGER NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    CONSTRAINT fk_event_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT fk_event_subscriptions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                    CONSTRAINT unique_user_event_subscription UNIQUE (user_id, event_id)
                );

                CREATE INDEX idx_event_subscriptions_user_id ON event_subscriptions(user_id);
                CREATE INDEX idx_event_subscriptions_event_id ON event_subscriptions(event_id);
            END IF;
        END $$;
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS event_subscriptions CASCADE;")
    op.execute("DROP TABLE IF EXISTS spot_favorites CASCADE;")

