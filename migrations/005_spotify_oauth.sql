-- Spotify OAuth tokens. Single row (id=1). Local-only, per-machine, never synced.
-- Holds the user's access/refresh tokens so the companion can control playback.
CREATE TABLE IF NOT EXISTS spotify_oauth (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    access_token  TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at    REAL NOT NULL,                       -- epoch seconds
    scope         TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
