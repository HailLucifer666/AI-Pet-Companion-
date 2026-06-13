-- 004: the companion (pet) and its experience ledger.
-- The pet row is a singleton created at hatch (NOT here) — XP awards no-op until
-- it exists. Light is conserved: XP is only ever earned from real work.

CREATE TABLE pet (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton
    name TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT '',
    voice TEXT NOT NULL DEFAULT 'warm',
    stage INTEGER NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 4),
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    mood TEXT NOT NULL DEFAULT 'content',
    traits_json TEXT,
    hatched_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,          -- positive = award, negative = claw-back
    ref TEXT,                         -- optional source id (memory_id, skill name, ...)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Drives the per-day-per-type award cap (anti-farming).
CREATE INDEX idx_xp_events_type_created ON xp_events (type, created_at);
