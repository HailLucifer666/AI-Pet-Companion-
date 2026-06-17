"""Repository for autonomy state cursors."""

import datetime

async def get(db, key: str) -> str | None:
    cur = await db.execute("SELECT value FROM autonomy_state WHERE key = ?", (key,))
    row = await cur.fetchone()
    return row["value"] if row else None

async def set(db, key: str, value: str) -> None:
    await db.execute(
        "INSERT INTO autonomy_state (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )

async def last_heartbeat_at(db) -> datetime.datetime | None:
    val = await get(db, "last_heartbeat_at")
    if val:
        try:
            return datetime.datetime.fromisoformat(val)
        except ValueError:
            pass
    return None

async def record_heartbeat(db, when: datetime.datetime) -> None:
    await set(db, "last_heartbeat_at", when.isoformat())

async def last_journal_day(db) -> str | None:
    return await get(db, "last_journal_day")

async def record_journal_day(db, day: str) -> None:
    await set(db, "last_journal_day", day)

async def acts_today(db, today: str) -> int:
    stored_date = await get(db, "acts_today_date")
    if stored_date != today:
        await set(db, "acts_today_date", today)
        await set(db, "acts_today_count", "0")
        return 0
    val = await get(db, "acts_today_count")
    try:
        return int(val) if val else 0
    except ValueError:
        return 0

async def bump_acts_today(db, today: str) -> None:
    current = await acts_today(db, today)
    await set(db, "acts_today_count", str(current + 1))
