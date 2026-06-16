import sqlite3
import os
import json
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "flompt.db")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def insert_conversation(platform: str, messages: list[dict], title: str = "") -> dict:
    import uuid
    conn = get_conn()
    row_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO conversations (id, platform, title, messages, created_at) VALUES (?, ?, ?, ?, ?)",
        (row_id, platform, title, json.dumps(messages, ensure_ascii=False), now),
    )
    conn.commit()
    conn.close()
    return {"id": row_id, "platform": platform, "title": title, "messages": messages, "created_at": now}


def list_conversations(limit: int = 50, offset: int = 0) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, platform, title, messages, created_at FROM conversations ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_conversation(conv_id: str) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT id, platform, title, messages, created_at FROM conversations WHERE id = ?", (conv_id,)).fetchone()
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
        "created_at": row["created_at"],
    }
