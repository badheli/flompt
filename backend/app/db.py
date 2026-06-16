import sqlite3
import os
import json
import hashlib
import uuid
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "flompt.db")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _md5(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest() if s else ""


def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id         TEXT PRIMARY KEY,
            platform   TEXT NOT NULL,
            title      TEXT NOT NULL DEFAULT '',
            messages   TEXT NOT NULL DEFAULT '[]',
            page_url   TEXT NOT NULL DEFAULT '',
            url_md5    TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)
    # Add columns if they don't exist (safe migration from v1)
    for col, typ in [("page_url", "TEXT NOT NULL DEFAULT ''"), ("url_md5", "TEXT NOT NULL DEFAULT ''")]:
        try:
            conn.execute(f"ALTER TABLE conversations ADD COLUMN {col} {typ}")
        except sqlite3.OperationalError:
            pass  # column already exists
    conn.execute("CREATE INDEX IF NOT EXISTS idx_conversations_url_md5 ON conversations(url_md5)")
    conn.commit()
    conn.close()


def upsert_conversation(platform: str, messages: list[dict], title: str = "", page_url: str = "") -> dict:
    conn = get_conn()
    md5 = _md5(page_url)
    now = _now()

    if md5:
        existing = conn.execute("SELECT id FROM conversations WHERE url_md5 = ?", (md5,)).fetchone()

    if md5 and existing:
        row_id = existing["id"]
        conn.execute(
            "UPDATE conversations SET messages = ?, title = ?, page_url = ? WHERE id = ?",
            (json.dumps(messages, ensure_ascii=False), title, page_url, row_id),
        )
    else:
        row_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO conversations (id, platform, title, messages, page_url, url_md5, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (row_id, platform, title, json.dumps(messages, ensure_ascii=False), page_url, md5, now),
        )

    conn.commit()
    row = conn.execute("SELECT * FROM conversations WHERE id = ?", (row_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def list_conversations(limit: int = 50, offset: int = 0) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, platform, title, messages, page_url, url_md5, created_at FROM conversations ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_conversation(conv_id: str) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT id, platform, title, messages, page_url, url_md5, created_at FROM conversations WHERE id = ?", (conv_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def delete_conversation(conv_id: str) -> bool:
    conn = get_conn()
    cur = conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "platform": row["platform"],
        "title": row["title"],
        "messages": json.loads(row["messages"]),
        "page_url": row["page_url"] if "page_url" in row.keys() else "",
        "url_md5": row["url_md5"] if "url_md5" in row.keys() else "",
        "created_at": row["created_at"],
    }
