"""API routes. Phase 0: health + bare streaming chat (no tools yet)."""

import json
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .. import __version__
from ..db.connection import vec_version
from ..providers import ProviderError

api_router = APIRouter()


@api_router.get("/health")
async def health(request: Request):
    vec = await vec_version(request.app.state.db)
    return {"status": "ok", "version": __version__, "sqlite_vec": vec}


@api_router.get("/models")
async def models(request: Request):
    config = request.app.state.config
    return {"roles": config.roles}


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=100_000)
    session_id: str | None = None
    role: str = "primary"


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@api_router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    db = request.app.state.db
    router = request.app.state.router
    config = request.app.state.config

    if req.role not in config.roles:
        raise HTTPException(400, f"Unknown role {req.role!r}")

    session_id = req.session_id or str(uuid.uuid4())
    cur = await db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    if await cur.fetchone() is None:
        await db.execute(
            "INSERT INTO sessions (id, title) VALUES (?, ?)",
            (session_id, req.message[:80]),
        )
    await db.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)",
        (session_id, req.message),
    )
    await db.execute(
        "UPDATE sessions SET last_active_at = datetime('now') WHERE id = ?", (session_id,)
    )
    await db.commit()

    cur = await db.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id", (session_id,)
    )
    history = [{"role": r["role"], "content": r["content"]} for r in await cur.fetchall()]

    async def stream():
        yield _sse({"type": "session", "session_id": session_id})
        full_text = []
        try:
            async for delta in router.chat_stream(req.role, history):
                if delta.text:
                    full_text.append(delta.text)
                    yield _sse({"type": "delta", "text": delta.text})
        except ProviderError as e:
            yield _sse({"type": "error", "message": str(e)})
            return
        text = "".join(full_text)
        await db.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)",
            (session_id, text),
        )
        await db.commit()
        yield _sse({"type": "done"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/sessions")
async def list_sessions(request: Request):
    cur = await request.app.state.db.execute(
        "SELECT id, title, created_at, last_active_at FROM sessions"
        " WHERE archived = 0 ORDER BY last_active_at DESC LIMIT 100"
    )
    return {"sessions": [dict(r) for r in await cur.fetchall()]}


@api_router.get("/sessions/{session_id}/messages")
async def session_messages(session_id: str, request: Request):
    cur = await request.app.state.db.execute(
        "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY id",
        (session_id,),
    )
    return {"messages": [dict(r) for r in await cur.fetchall()]}
