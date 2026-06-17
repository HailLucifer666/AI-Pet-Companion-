"""API routes for productivity surfaces: Tasks and Calendar."""

import json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

prod_router = APIRouter()

# ── Tasks ─────────────────────────────────────────────────────────────

class TaskBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    status: str = Field(default="open")
    due_date_iso: str | None = None
    tags: list[str] = Field(default_factory=list)

@prod_router.get("/tasks")
async def list_tasks(request: Request, q: str = ""):
    db = request.app.state.db
    if q.strip():
        terms = " OR ".join(f'"{t.replace(chr(34), chr(34) * 2)}"' for t in q.split() if t.strip())
        cur = await db.execute(
            "SELECT t.id, t.title, t.description, t.status, t.due_date_iso, t.tags, t.created_at, t.updated_at"
            " FROM tasks_fts f JOIN tasks t ON t.id = f.rowid"
            " WHERE tasks_fts MATCH ? ORDER BY rank LIMIT 100",
            (terms,),
        )
    else:
        cur = await db.execute(
            "SELECT id, title, description, status, due_date_iso, tags, created_at, updated_at FROM tasks"
            " ORDER BY updated_at DESC LIMIT 200"
        )
    tasks = [dict(r) for r in await cur.fetchall()]
    for t in tasks:
        t["tags"] = json.loads(t["tags"])
    return {"tasks": tasks}

@prod_router.post("/tasks")
async def create_task(body: TaskBody, request: Request):
    if body.status not in ("open", "in_progress", "done", "blocked"):
        raise HTTPException(400, "Invalid status")
    cur = await request.app.state.db.execute(
        "INSERT INTO tasks (title, description, status, due_date_iso, tags) VALUES (?, ?, ?, ?, ?)",
        (body.title, body.description, body.status, body.due_date_iso, json.dumps(body.tags)),
    )
    await request.app.state.db.commit()
    return {"id": cur.lastrowid}

@prod_router.put("/tasks/{task_id}")
async def update_task(task_id: int, body: TaskBody, request: Request):
    if body.status not in ("open", "in_progress", "done", "blocked"):
        raise HTTPException(400, "Invalid status")
    cur = await request.app.state.db.execute(
        "UPDATE tasks SET title = ?, description = ?, status = ?, due_date_iso = ?, tags = ?, updated_at = datetime('now')"
        " WHERE id = ?",
        (body.title, body.description, body.status, body.due_date_iso, json.dumps(body.tags), task_id),
    )
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such task")
    return {"ok": True}

@prod_router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, request: Request):
    cur = await request.app.state.db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such task")
    return {"ok": True}


# ── Events ────────────────────────────────────────────────────────────

class EventBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    start_iso: str
    end_iso: str
    location: str | None = None

@prod_router.get("/events")
async def list_events(request: Request, q: str = ""):
    db = request.app.state.db
    if q.strip():
        terms = " OR ".join(f'"{t.replace(chr(34), chr(34) * 2)}"' for t in q.split() if t.strip())
        cur = await db.execute(
            "SELECT e.id, e.title, e.description, e.start_iso, e.end_iso, e.location, e.created_at, e.updated_at"
            " FROM events_fts f JOIN events e ON e.id = f.rowid"
            " WHERE events_fts MATCH ? ORDER BY rank LIMIT 100",
            (terms,),
        )
    else:
        cur = await db.execute(
            "SELECT id, title, description, start_iso, end_iso, location, created_at, updated_at FROM events"
            " ORDER BY start_iso DESC LIMIT 200"
        )
    events = [dict(r) for r in await cur.fetchall()]
    return {"events": events}

@prod_router.post("/events")
async def create_event(body: EventBody, request: Request):
    cur = await request.app.state.db.execute(
        "INSERT INTO events (title, description, start_iso, end_iso, location) VALUES (?, ?, ?, ?, ?)",
        (body.title, body.description, body.start_iso, body.end_iso, body.location),
    )
    await request.app.state.db.commit()
    return {"id": cur.lastrowid}

@prod_router.put("/events/{event_id}")
async def update_event(event_id: int, body: EventBody, request: Request):
    cur = await request.app.state.db.execute(
        "UPDATE events SET title = ?, description = ?, start_iso = ?, end_iso = ?, location = ?, updated_at = datetime('now')"
        " WHERE id = ?",
        (body.title, body.description, body.start_iso, body.end_iso, body.location, event_id),
    )
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such event")
    return {"ok": True}

@prod_router.delete("/events/{event_id}")
async def delete_event(event_id: int, request: Request):
    cur = await request.app.state.db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such event")
    return {"ok": True}


# ── Documents ─────────────────────────────────────────────────────────

class DocumentBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="")
    doc_type: str = Field(default="md", pattern="^(md|html|csv)$")

@prod_router.get("/documents")
async def list_documents(request: Request, q: str = ""):
    db = request.app.state.db
    if q.strip():
        terms = " OR ".join(f'"{t.replace(chr(34), chr(34) * 2)}"' for t in q.split() if t.strip())
        cur = await db.execute(
            "SELECT d.id, d.title, d.content, d.doc_type, d.created_at, d.updated_at"
            " FROM documents_fts f JOIN documents d ON d.id = f.rowid"
            " WHERE documents_fts MATCH ? ORDER BY rank LIMIT 100",
            (terms,),
        )
    else:
        cur = await db.execute(
            "SELECT id, title, content, doc_type, created_at, updated_at FROM documents"
            " ORDER BY updated_at DESC LIMIT 200"
        )
    docs = [dict(r) for r in await cur.fetchall()]
    return {"documents": docs}

@prod_router.post("/documents")
async def create_document(body: DocumentBody, request: Request):
    cur = await request.app.state.db.execute(
        "INSERT INTO documents (title, content, doc_type) VALUES (?, ?, ?)",
        (body.title, body.content, body.doc_type),
    )
    await request.app.state.db.commit()
    return {"id": cur.lastrowid}

@prod_router.put("/documents/{doc_id}")
async def update_document(doc_id: int, body: DocumentBody, request: Request):
    cur = await request.app.state.db.execute(
        "UPDATE documents SET title = ?, content = ?, doc_type = ?, updated_at = datetime('now')"
        " WHERE id = ?",
        (body.title, body.content, body.doc_type, doc_id),
    )
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such document")
    return {"ok": True}

@prod_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, request: Request):
    cur = await request.app.state.db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such document")
    return {"ok": True}
