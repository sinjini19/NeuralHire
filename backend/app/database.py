"""SQLAlchemy engine, session factory and table creation."""
from collections.abc import Iterator
from datetime import timezone

from sqlalchemy import DateTime, TypeDecorator, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app import config


class Base(DeclarativeBase):
    """All models inherit from this; it keeps the table registry."""


class UTCDateTime(TypeDecorator):
    """SQLite has no real timezone support and returns naive datetimes.
    This type stores UTC and always hands back timezone-aware UTC values,
    so the API emits proper ISO strings (…+00:00) the browser reads correctly."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Use timezone-aware datetimes (datetime.now(timezone.utc)).")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        return None if value is None else value.replace(tzinfo=timezone.utc)


def _make_engine(url: str):
    kwargs = {}
    if url.startswith("sqlite"):
        # FastAPI runs sync endpoints in a thread pool, so SQLite must allow that.
        kwargs["connect_args"] = {"check_same_thread": False}
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    return create_engine(url, **kwargs)


engine = _make_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create any missing tables. Safe to call on every startup.
    NOTE: create_all never ALTERs existing tables. See README for schema changes."""
    from app import models  # noqa: F401  (importing registers the tables on Base)

    Base.metadata.create_all(bind=engine)
