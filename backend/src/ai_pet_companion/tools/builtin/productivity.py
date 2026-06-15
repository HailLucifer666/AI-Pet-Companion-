"""Agent tools for managing tasks and calendar events."""

import json
from datetime import datetime

from pydantic import BaseModel, Field

from ..registry import Registry, Risk, ToolContext, tool

# â”€â”€ Params â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CreateTaskParams(BaseModel):
    title: str = Field(description="Short, descriptive title.")
    description: str = Field(default="", description="Longer details if necessary.")
    due_date_iso: str | None = Field(default=None, description="Optional ISO 8601 date string (e.g. '2026-06-16').")
    tags: list[str] | None = Field(default=None, description="Optional list of tags.")

class ListTasksParams(BaseModel):
    status: str | None = Field(default=None, description="Optional status to filter by ('open', 'in_progress', 'done', 'blocked').")

class UpdateTaskStatusParams(BaseModel):
    task_id: int = Field(description="The ID of the task to update.")
    status: str = Field(description="One of: 'open', 'in_progress', 'done', 'blocked'.")

class CreateEventParams(BaseModel):
    title: str = Field(description="Event title.")
    start_iso: str = Field(description="ISO 8601 start time (e.g. '2026-06-16T15:00:00Z').")
    end_iso: str = Field(description="ISO 8601 end time.")
    description: str = Field(default="", description="Optional details.")
    location: str | None = Field(default=None, description="Optional location.")

class ListEventsParams(BaseModel):
    after_iso: str | None = Field(default=None, description="ISO 8601 time to fetch events after. Defaults to now.")

class RescheduleEventParams(BaseModel):
    event_id: int = Field(description="The ID of the event to reschedule.")
    new_start_iso: str = Field(description="ISO 8601 new start time.")
    new_end_iso: str = Field(description="ISO 8601 new end time.")

class CreateDocumentParams(BaseModel):
    title: str = Field(description="Document title.")
    content: str = Field(default="", description="The full markdown, HTML, or CSV content.")
    doc_type: str = Field(default="md", description="One of: 'md', 'html', 'csv'.")

class UpdateDocumentParams(BaseModel):
    doc_id: int = Field(description="The ID of the document to update.")
    title: str = Field(description="New title for the document.")
    content: str = Field(description="The entirely new content. Make sure to include everything.")
    doc_type: str = Field(description="One of: 'md', 'html', 'csv'.")

class SearchDocumentsParams(BaseModel):
    query: str = Field(description="Search term to find relevant documents.")

# â”€â”€ Register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def register(registry: Registry) -> None:
    @tool(
        registry,
        name="create_task",
        description="Create a new task on the user's task board.",
        risk=Risk.WRITE,
    )
    async def create_task(params: CreateTaskParams, ctx: ToolContext) -> str:
        tags_json = json.dumps(params.tags or [])
        cur = await ctx.db.execute(
            "INSERT INTO tasks (title, description, due_date_iso, tags) VALUES (?, ?, ?, ?)",
            (params.title, params.description, params.due_date_iso, tags_json)
        )
        await ctx.db.commit()
        return f"Task created with ID {cur.lastrowid}"

    @tool(
        registry,
        name="list_tasks",
        description="List open and in-progress tasks. Optionally filter by a specific status.",
        risk=Risk.READ,
    )
    async def list_tasks(params: ListTasksParams, ctx: ToolContext) -> str:
        if params.status:
            cur = await ctx.db.execute("SELECT id, title, status, due_date_iso FROM tasks WHERE status = ?", (params.status,))
        else:
            cur = await ctx.db.execute("SELECT id, title, status, due_date_iso FROM tasks WHERE status IN ('open', 'in_progress')")
        
        rows = await cur.fetchall()
        if not rows:
            return "No matching tasks found."
        
        out = ["Found tasks:"]
        for r in rows:
            out.append(f"- [{r['id']}] {r['title']} ({r['status']}) due: {r['due_date_iso'] or 'none'}")
        return "\n".join(out)

    @tool(
        registry,
        name="update_task_status",
        description="Update the status of a task.",
        risk=Risk.WRITE,
    )
    async def update_task_status(params: UpdateTaskStatusParams, ctx: ToolContext) -> str:
        if params.status not in ('open', 'in_progress', 'done', 'blocked'):
            return "Error: status must be open, in_progress, done, or blocked"
        
        cur = await ctx.db.execute("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?", (params.status, params.task_id))
        await ctx.db.commit()
        if cur.rowcount == 0:
            return f"Task {params.task_id} not found."
        return f"Task {params.task_id} marked as {params.status}."

    @tool(
        registry,
        name="create_event",
        description="Create a new calendar event.",
        risk=Risk.WRITE,
    )
    async def create_event(params: CreateEventParams, ctx: ToolContext) -> str:
        cur = await ctx.db.execute(
            "INSERT INTO events (title, description, start_iso, end_iso, location) VALUES (?, ?, ?, ?, ?)",
            (params.title, params.description, params.start_iso, params.end_iso, params.location)
        )
        await ctx.db.commit()
        return f"Event created with ID {cur.lastrowid}"

    @tool(
        registry,
        name="list_events",
        description="List upcoming calendar events.",
        risk=Risk.READ,
    )
    async def list_events(params: ListEventsParams, ctx: ToolContext) -> str:
        now = params.after_iso or datetime.utcnow().isoformat()
        cur = await ctx.db.execute("SELECT id, title, start_iso, end_iso FROM events WHERE start_iso >= ? ORDER BY start_iso ASC LIMIT 20", (now,))
        rows = await cur.fetchall()
        if not rows:
            return "No upcoming events found."
        
        out = ["Upcoming events:"]
        for r in rows:
            out.append(f"- [{r['id']}] {r['title']} ({r['start_iso']} to {r['end_iso']})")
        return "\n".join(out)

    @tool(
        registry,
        name="reschedule_event",
        description="Reschedule an existing calendar event.",
        risk=Risk.WRITE,
    )
    async def reschedule_event(params: RescheduleEventParams, ctx: ToolContext) -> str:
        cur = await ctx.db.execute("UPDATE events SET start_iso = ?, end_iso = ?, updated_at = datetime('now') WHERE id = ?", (params.new_start_iso, params.new_end_iso, params.event_id))
        await ctx.db.commit()
        if cur.rowcount == 0:
            return f"Event {params.event_id} not found."
        return f"Event {params.event_id} rescheduled to start at {params.new_start_iso}."

    @tool(
        registry,
        name="create_document",
        description="Create a new document (markdown, html, or csv).",
        risk=Risk.WRITE,
    )
    async def create_document(params: CreateDocumentParams, ctx: ToolContext) -> str:
        if params.doc_type not in ("md", "html", "csv"):
            return "Error: doc_type must be md, html, or csv"
        cur = await ctx.db.execute(
            "INSERT INTO documents (title, content, doc_type) VALUES (?, ?, ?)",
            (params.title, params.content, params.doc_type)
        )
        await ctx.db.commit()
        return f"Document created with ID {cur.lastrowid}"

    @tool(
        registry,
        name="update_document",
        description="Overwrite a document with new content. Provide the ENTIRE new content.",
        risk=Risk.WRITE,
    )
    async def update_document(params: UpdateDocumentParams, ctx: ToolContext) -> str:
        if params.doc_type not in ("md", "html", "csv"):
            return "Error: doc_type must be md, html, or csv"
        cur = await ctx.db.execute(
            "UPDATE documents SET title = ?, content = ?, doc_type = ?, updated_at = datetime('now') WHERE id = ?",
            (params.title, params.content, params.doc_type, params.doc_id)
        )
        await ctx.db.commit()
        if cur.rowcount == 0:
            return f"Document {params.doc_id} not found."
        return f"Document {params.doc_id} updated."

    @tool(
        registry,
        name="search_documents",
        description="Search through documents.",
        risk=Risk.READ,
    )
    async def search_documents(params: SearchDocumentsParams, ctx: ToolContext) -> str:
        terms = " OR ".join(f'"{t.replace(chr(34), chr(34) * 2)}"' for t in params.query.split() if t.strip())
        if not terms:
            return "Empty search query."
        cur = await ctx.db.execute(
            "SELECT d.id, d.title, d.doc_type, snippet(documents_fts, 1, '>>', '<<', 'â€¦', 16) AS snip"
            " FROM documents_fts f JOIN documents d ON d.id = f.rowid"
            " WHERE documents_fts MATCH ? ORDER BY rank LIMIT 20",
            (terms,)
        )
        rows = await cur.fetchall()
        if not rows:
            return "No matching documents found."
        out = ["Found documents:"]
        for r in rows:
            out.append(f"- [{r['id']}] {r['title']} ({r['doc_type']}): {r['snip']}")
        return "\n".join(out)
