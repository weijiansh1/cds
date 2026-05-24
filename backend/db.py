from __future__ import annotations

import sqlite3
from pathlib import Path

import os

ROOT_DIR = Path(__file__).resolve().parents[1]

# Vercel serverless environment: /tmp is the only writable directory
if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
    DATA_DIR = Path("/tmp/data")
    DB_PATH = DATA_DIR / "dashboard.sqlite3"
else:
    DATA_DIR = ROOT_DIR / "data"
    DB_PATH = DATA_DIR / "dashboard.sqlite3"


def ensure_database() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS city_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                city TEXT NOT NULL,
                date_key INTEGER NOT NULL,
                date_iso TEXT NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                counterfactual REAL NOT NULL,
                observed REAL NOT NULL,
                net_reduction REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(city, date_key)
            )
            """
        )
        conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS trg_city_daily_updated_at
            AFTER UPDATE ON city_daily
            FOR EACH ROW
            BEGIN
                UPDATE city_daily SET updated_at = datetime('now') WHERE id = OLD.id;
            END;
            """
        )
        conn.commit()
    finally:
        conn.close()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
