-- 006: Productivity Surfaces (Tasks & Calendar)

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'blocked')),
    due_date_iso TEXT,
    tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE tasks_fts USING fts5(
    title, description, tags,
    content='tasks',
    content_rowid='id'
);

CREATE TRIGGER tasks_ai AFTER INSERT ON tasks BEGIN
    INSERT INTO tasks_fts(rowid, title, description, tags) VALUES (new.id, new.title, new.description, new.tags);
END;
CREATE TRIGGER tasks_ad AFTER DELETE ON tasks BEGIN
    INSERT INTO tasks_fts(tasks_fts, rowid, title, description, tags) VALUES ('delete', old.id, old.title, old.description, old.tags);
END;
CREATE TRIGGER tasks_au AFTER UPDATE ON tasks BEGIN
    INSERT INTO tasks_fts(tasks_fts, rowid, title, description, tags) VALUES ('delete', old.id, old.title, old.description, old.tags);
    INSERT INTO tasks_fts(rowid, title, description, tags) VALUES (new.id, new.title, new.description, new.tags);
END;


CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    start_iso TEXT NOT NULL,
    end_iso TEXT NOT NULL,
    location TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE events_fts USING fts5(
    title, description, location,
    content='events',
    content_rowid='id'
);

CREATE TRIGGER events_ai AFTER INSERT ON events BEGIN
    INSERT INTO events_fts(rowid, title, description, location) VALUES (new.id, new.title, new.description, new.location);
END;
CREATE TRIGGER events_ad AFTER DELETE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, description, location) VALUES ('delete', old.id, old.title, old.description, old.location);
END;
CREATE TRIGGER events_au AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, description, location) VALUES ('delete', old.id, old.title, old.description, old.location);
    INSERT INTO events_fts(rowid, title, description, location) VALUES (new.id, new.title, new.description, new.location);
END;
