from pathlib import Path
from threading import Lock

from flask import current_app
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Integer,
    MetaData,
    Table,
    Text,
    create_engine,
    desc,
    func,
    insert,
    select,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError


DatabaseError = SQLAlchemyError

_metadata = MetaData()
_engine: Engine | None = None
_engine_url: str | None = None
_engine_lock = Lock()

leads = Table(
    "leads",
    _metadata,
    Column(
        "id",
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    ),
    Column("isim", Text, nullable=False),
    Column("telefon", Text, nullable=False),
    Column("mesaj", Text),
    Column(
        "tarih",
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
)


def _normalize_database_url(raw_url: str) -> str:
    """Return a SQLAlchemy URL for Render Postgres or a local SQLite file."""
    value = (raw_url or "").strip()
    if not value:
        value = "aesir_axiom_leads.db"

    if value.startswith("postgresql+psycopg://"):
        return value
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("sqlite://"):
        return value

    return f"sqlite:///{Path(value).expanduser().resolve()}"


def _create_database_engine(database_url: str) -> Engine:
    normalized_url = _normalize_database_url(database_url)
    options: dict[str, object] = {
        "future": True,
        "pool_pre_ping": True,
    }

    if normalized_url.startswith("sqlite://"):
        options["connect_args"] = {"check_same_thread": False}

    return create_engine(normalized_url, **options)


def get_engine() -> Engine:
    """Return one process-local connection pool for the configured database."""
    global _engine, _engine_url

    database_url = _normalize_database_url(current_app.config["DATABASE_URL"])
    if _engine is not None and _engine_url == database_url:
        return _engine

    with _engine_lock:
        if _engine is not None and _engine_url == database_url:
            return _engine

        if _engine is not None:
            _engine.dispose()

        _engine = _create_database_engine(database_url)
        _engine_url = database_url
        return _engine


def init_db(app):
    """Create the leads table when it does not already exist."""
    with app.app_context():
        _metadata.create_all(get_engine())


def database_is_ready() -> bool:
    """Verify that the configured database accepts a simple query."""
    with get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))
    return True


def lead_ekle(isim, telefon, mesaj=None):
    """Store a lead and return its generated row id."""
    if not isim or not telefon:
        raise ValueError("isim ve telefon zorunludur")

    with get_engine().begin() as connection:
        result = connection.execute(
            insert(leads).values(isim=isim, telefon=telefon, mesaj=mesaj)
        )
        return result.inserted_primary_key[0]


def tum_leadler():
    """Return all leads as dictionaries, with the newest record first."""
    query = select(
        leads.c.id,
        leads.c.isim,
        leads.c.telefon,
        leads.c.mesaj,
        leads.c.tarih,
    ).order_by(desc(leads.c.tarih), desc(leads.c.id))

    with get_engine().connect() as connection:
        rows = connection.execute(query).mappings().all()

    output = []
    for row in rows:
        item = dict(row)
        timestamp = item.get("tarih")
        if hasattr(timestamp, "isoformat"):
            item["tarih"] = timestamp.isoformat()
        output.append(item)
    return output
