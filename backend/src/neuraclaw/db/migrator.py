"""Numbered SQL migrations: NNN_name.sql applied in order, tracked in schema_migrations."""

import re
from pathlib import Path

import aiosqlite

_MIGRATION_RE = re.compile(r"^(\d{3})_.+\.sql$")


async def migrate(db: aiosqlite.Connection, migrations_dir: str | Path) -> list[int]:
    await db.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        " version INTEGER PRIMARY KEY,"
        " applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
    )
    cur = await db.execute("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")
    current = (await cur.fetchone())[0]

    pending: list[tuple[int, Path]] = []
    for f in sorted(Path(migrations_dir).glob("*.sql")):
        m = _MIGRATION_RE.match(f.name)
        if m and int(m.group(1)) > current:
            pending.append((int(m.group(1)), f))

    applied = []
    for version, f in pending:
        await db.executescript(f.read_text(encoding="utf-8"))
        await db.execute("INSERT INTO schema_migrations (version) VALUES (?)", (version,))
        await db.commit()
        applied.append(version)
    return applied
