from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

from dotenv import load_dotenv

# Ensure imports resolve when Alembic is run from the project root.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

# Load environment variables early so DATABASE_URL is available.
# Explicitly load from project root to ensure .env is found regardless of cwd.
env_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=env_path)

# Alembic Config object provides access to values within alembic.ini.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Update sqlalchemy.url dynamically from DATABASE_URL or DATABASE_URL_LOCAL, if set.
if os.getenv("LOCAL_DB"):
    database_url = os.getenv("DATABASE_URL_LOCAL")
else:
    database_url = os.getenv("DATABASE_URL")

if database_url:
    config.set_main_option("sqlalchemy.url", database_url)
else:
    env_file = PROJECT_ROOT / ".env"
    error_msg = (
        "DATABASE_URL (or DATABASE_URL_LOCAL with LOCAL_DB=true) is not set.\n"
        f"Alembic needs this value to run migrations.\n"
        f"Expected .env file at: {env_file}\n"
        "Define DATABASE_URL in your environment or .env file.\n"
        "Example: DATABASE_URL=postgresql+psycopg://user:pass@localhost:5440/dbname"
    )
    raise RuntimeError(error_msg)

# Import metadata after sys.path has been updated.
from app.models import Base  # noqa: E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
