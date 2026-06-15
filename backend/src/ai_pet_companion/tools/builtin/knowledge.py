"""Agent-facing memory, history and notes tools."""

from pydantic import BaseModel, Field

from ...memory import store
from ..registry import Registry, Risk, ToolContext, tool


class RememberParams(BaseModel):
    type: str = Field(description="One of: identity, preference, project, event, fact")
    content: str = Field(min_length=4, max_length=500, description="One self-contained sentence")


class ForgetParams(BaseModel):
    memory_id: int


class SearchMemoryParams(BaseModel):
    query: str = Field(min_length=2)


class SearchHistoryParams(BaseModel):
    query: str = Field(min_length=2, description="Full-text search over all past sessions")


class CreateNoteParams(BaseModel):
    title: str = Field(max_length=200)
    content_md: str = Field(max_length=50_000)


class SearchNotesParams(BaseModel):
    query: str = Field(min_length=2)


def _fts_escape(query: str) -> str:
    terms = [t.replace('"', '""') for t in query.split() if t.strip()]
    return " OR ".join(f'"{t}"' for t in terms)


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="remember",
        description="Store a durable fact about the user or their world in long-term memory.",
        risk=Risk.WRITE,
    )
    async def remember(params: RememberParams, ctx: ToolContext) -> str:
        if params.type not in store.MEMORY_TYPES:
            return f"Invalid type. Use one of: {', '.join(store.MEMORY_TYPES)}"
        memory_id = await store.add_memory(
            ctx.db, type=params.type, content=params.content,
            source_session_id=ctx.session_id,
        )
        if memory_id is None:
            return "Already known (deduplicated)."
        return f"Remembered (id {memory_id})."

    @tool(
        registry,
        name="forget",
        description="Delete a memory by id (use search_memory first to find the id).",
        risk=Risk.WRITE,
    )
    async def forget(params: ForgetParams, ctx: ToolContext) -> str:
        ok = await store.forget_memory(ctx.db, params.memory_id)
        return "Forgotten." if ok else f"No memory with id {params.memory_id}."

    @tool(
        registry,
        name="search_memory",
        description="Search long-term memory (hybrid semantic + keyword).",
        risk=Risk.READ,
    )
    async def search_memory(params: SearchMemoryParams, ctx: ToolContext) -> str:
        memories = await store.search_memories(ctx.db, params.query)
        if not memories:
            return "No matching memories."
        return "\n".join(f"[{m.id}] ({m.type}) {m.content}" for m in memories)

    @tool(
        registry,
        name="search_history",
        description="Full-text search across all past conversation sessions.",
        risk=Risk.READ,
    )
    async def search_history(params: SearchHistoryParams, ctx: ToolContext) -> str:
        fts = _fts_escape(params.query)
        if not fts:
            return "Empty query."
        cur = await ctx.db.execute(
            "SELECT m.session_id, m.role, snippet(messages_fts, 0, '>>', '<<', 'â€¦', 20) AS snip,"
            " m.created_at"
            " FROM messages_fts f JOIN messages m ON m.id = f.rowid"
            " WHERE messages_fts MATCH ? ORDER BY rank LIMIT 10",
            (fts,),
        )
        rows = await cur.fetchall()
        if not rows:
            return "No matches in history."
        return "\n".join(
            f"- [{r['created_at']}] ({r['role']}, session {r['session_id'][:8]}) {r['snip']}"
            for r in rows
        )

    @tool(
        registry,
        name="create_note",
        description="Create a note in the user's notes collection.",
        risk=Risk.WRITE,
    )
    async def create_note(params: CreateNoteParams, ctx: ToolContext) -> str:
        cur = await ctx.db.execute(
            "INSERT INTO notes (title, content_md) VALUES (?, ?)",
            (params.title, params.content_md),
        )
        await ctx.db.commit()
        return f"Note created (id {cur.lastrowid})."

    @tool(
        registry,
        name="search_notes",
        description="Full-text search the user's notes.",
        risk=Risk.READ,
    )
    async def search_notes(params: SearchNotesParams, ctx: ToolContext) -> str:
        fts = _fts_escape(params.query)
        cur = await ctx.db.execute(
            "SELECT n.id, n.title, snippet(notes_fts, 1, '>>', '<<', 'â€¦', 16) AS snip"
            " FROM notes_fts f JOIN notes n ON n.id = f.rowid"
            " WHERE notes_fts MATCH ? ORDER BY rank LIMIT 10",
            (fts,),
        )
        rows = await cur.fetchall()
        if not rows:
            return "No matching notes."
        return "\n".join(f"[{r['id']}] {r['title']}: {r['snip']}" for r in rows)
