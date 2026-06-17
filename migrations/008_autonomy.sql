-- 008: autonomy run-state, journal, proactive utterances, pet energy.

-- Durable scheduler cursors so a sidecar restart can't skip/double-run a window.
-- Singleton-ish key/value of ISO timestamps + counters. One row per logical clock.
CREATE TABLE autonomy_state (
    key   TEXT PRIMARY KEY,          -- 'last_heartbeat_at' | 'last_journal_day' | 'acts_today_date' | 'acts_today_count'
    value TEXT NOT NULL DEFAULT ''
);

-- First-person nightly journal entries (the NOW.md scratchpad, versioned by day).
CREATE TABLE journal (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    day         TEXT NOT NULL,                       -- local date 'YYYY-MM-DD' (UNIQUE: one canonical entry/day)
    summary_md  TEXT NOT NULL DEFAULT '',            -- the "NOW" scratchpad body (first-person)
    mood        TEXT NOT NULL DEFAULT 'content',     -- mood at journal time
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_journal_day ON journal(day);

-- Proactive utterances the companion produced on its own (heartbeat escalations).
-- Gives proactive output a HOME and an engagement signal for proactive_useful XP.
CREATE TABLE proactive_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,                       -- the session the utterance lives in (visible surface)
    text        TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'heartbeat',   -- 'heartbeat' | 'journal'
    engaged     INTEGER NOT NULL DEFAULT 0,          -- user acknowledged/replied -> 1 (awards proactive_useful)
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_proactive_unengaged ON proactive_messages(engaged) WHERE engaged = 0;

-- Server-side energy for the pet (0..100). Single column on the singleton row.
ALTER TABLE pet ADD COLUMN energy INTEGER NOT NULL DEFAULT 80 CHECK (energy BETWEEN 0 AND 100);
