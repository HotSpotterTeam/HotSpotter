import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from contextlib import contextmanager

# Load environment variables from .env so local development "just works".
load_dotenv()

if os.getenv("LOCAL_DB") is not None:
    _DATABASE_URL = os.getenv("DATABASE_URL_LOCAL")
else:
    _DATABASE_URL = os.getenv("DATABASE_URL")

# Connection pool configuration optimized for Supabase
# - pool_size: number of connections to keep open
# - max_overflow: extra connections allowed when pool is full
# - pool_timeout: seconds to wait for a connection
# - pool_recycle: recycle connections after this many seconds (prevents stale connections)
# - pool_pre_ping: test connections before using (handles dropped connections)
_engine = create_engine(
    _DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections every 30 minutes
    future=True,
)

_SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=_engine,
    future=True,
)


@contextmanager
def get_session() -> Session:
    """
    Context manager for database sessions.
    Automatically closes session after use.

    Usage:
        with get_session() as session:
            session.query(...)
    """
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()
