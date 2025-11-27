import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Load environment variables from .env so local development "just works".
load_dotenv()

_DATABASE_URL = os.getenv("DATABASE_URL")
if not _DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to your .env file (e.g. DATABASE_URL=postgresql+psycopg://...)."
    )

_engine = create_engine(_DATABASE_URL, pool_pre_ping=True, future=True)
_SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=_engine,
    future=True,
)


def get_session() -> Session:
    """
    Return a plain SQLAlchemy Session created from the configured engine.
    Caller is responsible for committing/rolling back and closing the session.
    """
    return _SessionLocal()
