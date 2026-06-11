-- 002: memory engine, user profile, notes, tool audit log.

CREATE TABLE memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('identity', 'preference', 'project', 'event', 'fact')),
    content TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    source_session_id TEXT,
    superseded_by INTEGER REFERENCES memories(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_accessed_at TEXT,
    access_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_memories_type ON memories(type) WHERE superseded_by IS NULL;

CREATE VIRTUAL TABLE memories_fts USING fts5(
    content,
    content='memories',
    content_rowid='id'
);
CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.id, old.content);
END;
CREATE TRIGGER memories_au AFTER UPDATE OF content ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.id, old.content);
    INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
END;

-- Vector index. model_name recorded so a future re-embed migration is possible.
CREATE VIRTUAL TABLE vec_memories USING vec0(
    memory_id INTEGER PRIMARY KEY,
    embedding float[384],
    +model_name TEXT
);

CREATE TABLE user_profile (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    content_md TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE VIRTUAL TABLE notes_fts USING fts5(
    title, content_md,
    content='notes',
    content_rowid='id'
);
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, title, content_md) VALUES (new.id, new.title, new.content_md);
END;
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content_md)
    VALUES ('delete', old.id, old.title, old.content_md);
END;
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content_md)
    VALUES ('delete', old.id, old.title, old.content_md);
    INSERT INTO notes_fts(rowid, title, content_md) VALUES (new.id, new.title, new.content_md);
END;

CREATE TABLE tool_invocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    tool_name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'builtin' CHECK (source IN ('builtin', 'skill', 'mcp')),
    args_json TEXT,
    result_summary TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
