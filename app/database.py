import sqlite3

from flask import current_app


def get_db():
    """Open a configured SQLite connection with named-column access."""
    connection = sqlite3.connect(current_app.config["DATABASE_URL"])
    connection.row_factory = sqlite3.Row
    return connection


def init_db(app):
    """Create the leads table when it does not already exist."""
    with app.app_context():
        connection = get_db()
        try:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    isim TEXT NOT NULL,
                    telefon TEXT NOT NULL,
                    mesaj TEXT,
                    tarih TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.commit()
        finally:
            connection.close()


def lead_ekle(isim, telefon, mesaj=None):
    """Store a lead and return its generated row id."""
    if not isim or not telefon:
        raise ValueError("isim ve telefon zorunludur")

    connection = get_db()
    try:
        cursor = connection.execute(
            """
            INSERT INTO leads (isim, telefon, mesaj)
            VALUES (?, ?, ?)
            """,
            (isim, telefon, mesaj),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        connection.close()


def tum_leadler():
    """Return all leads as dictionaries, with the newest record first."""
    connection = get_db()
    try:
        rows = connection.execute(
            """
            SELECT id, isim, telefon, mesaj, tarih
            FROM leads
            ORDER BY tarih DESC, id DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()
