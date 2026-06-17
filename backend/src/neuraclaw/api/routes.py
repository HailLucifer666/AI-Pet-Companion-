"""API routes: health, chat (agent loop over SSE), sessions, memory, notes, profile."""

import asyncio
import json
import logging
import secrets
import uuid

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel, Field

from .. import __version__
from ..config import REPO_ROOT, SOUL_PATH, write_env_keys
from ..core import agent
from ..core.synapse import sse_stream, synapse as _synapse
from ..core.vision import resolve_vision
from ..db.connection import vec_version
from ..integrations import spotify
from ..integrations.spotify import SpotifyClient, SpotifyError
from ..memory import extractor, store
from ..pet import hatch as hatch_svc, xp
from ..providers import parse_ref
from ..skillsys import loader as skill_loader
from ..weather import fetch_weather

from .productivity import prod_router

log = logging.getLogger(__name__)
api_router = APIRouter()
api_router.include_router(prod_router)


@api_router.get("/health")
async def health(request: Request):
    vec = await vec_version(request.app.state.db)
    return {"status": "ok", "version": __version__, "sqlite_vec": vec}


@api_router.get("/events")
async def events():
    return StreamingResponse(
        sse_stream(_synapse),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/weather")
async def weather():
    """Real current weather for the Grove's sky (best-effort, cached, keyless)."""
    return await fetch_weather()


@api_router.get("/models")
async def models(request: Request):
    config = request.app.state.config
    return {"roles": config.roles}


@api_router.get("/models/available")
async def models_available(request: Request):
    """Every model each provider advertises live (OpenAI ``GET /v1/models``).

    Providers are probed concurrently with a short per-provider timeout; one that
    is unreachable or keyless returns ``reachable: false`` with no models. No error
    or key text is ever exposed — only the boolean and the real model list.
    """
    router = request.app.state.router
    config = request.app.state.config

    async def probe(name: str) -> tuple[str, dict]:
        try:
            models = await asyncio.wait_for(router.list_provider_models(name), timeout=4.0)
        except Exception:  # noqa: BLE001 — timeout or anything else => unreachable
            models = None
        # `models is None` => unreachable; `[]` => reachable but advertises nothing.
        return name, {"reachable": models is not None, "models": models or []}

    results = await asyncio.gather(*(probe(name) for name in config.providers))
    return {"providers": dict(results)}


@api_router.get("/settings")
async def settings(request: Request):
    """Provider/key status for the settings surface. Never returns key values."""
    import os

    config = request.app.state.config
    providers = {
        name: {
            "base_url": pc.base_url,
            "key_env": pc.api_key_env or None,
            "key_present": bool(pc.api_key_env and os.environ.get(pc.api_key_env))
            or not pc.api_key_env,
        }
        for name, pc in config.providers.items()
    }
    return {
        "providers": providers,
        "roles": config.roles,
        "trust": {"max_auto_risk": config.trust.max_auto_risk},
    }


class KeysRequest(BaseModel):
    # env-var name -> secret value (e.g. {"OPENROUTER_API_KEY": "sk-..."}).
    keys: dict[str, str]


@api_router.post("/settings/keys")
async def set_keys(body: KeysRequest, request: Request):
    """Write provider API keys to .env (live, no restart). Values are never echoed.

    Returns only the names written and a fresh brain probe — never any value.
    """
    if not body.keys:
        raise HTTPException(400, "no keys provided")
    try:
        names = write_env_keys(REPO_ROOT / ".env", body.keys)
    except ValueError as e:
        raise HTTPException(400, str(e))
    brain = await _detect_brain(request.app.state.config)
    return {"ok": True, "set": names, "brain": brain}


# ── Spotify (OAuth connect, for the play_music / control_playback tools) ──

# In-memory CSRF states for the login handshake (single-user local app; a fresh
# state per login, validated once on callback). Reset on restart is harmless.
_spotify_states: set[str] = set()


def _spotify_redirect_uri(config) -> str:
    return f"http://{config.server.host}:{config.server.port}/api/spotify/callback"


@api_router.get("/spotify/status")
async def spotify_status(request: Request):
    """Connection + account snapshot for the Settings card. Never returns tokens."""
    client = SpotifyClient(request.app.state.db)
    return await client.status()


@api_router.get("/spotify/login")
async def spotify_login(request: Request):
    """Begin the OAuth handshake — redirect the browser to Spotify's consent page."""
    config = request.app.state.config
    if not spotify.configured():
        raise HTTPException(
            400, "Spotify app credentials missing — set SPOTIFY_CLIENT_ID/SECRET in .env."
        )
    state = secrets.token_urlsafe(24)
    _spotify_states.add(state)
    return RedirectResponse(spotify.authorize_url(_spotify_redirect_uri(config), state))


@api_router.get("/spotify/callback")
async def spotify_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    """OAuth return: validate state (CSRF), exchange code for tokens, store, bounce to Settings."""
    if error or not code or not state or state not in _spotify_states:
        return RedirectResponse("/settings?spotify=error")
    _spotify_states.discard(state)
    config = request.app.state.config
    try:
        toks = await spotify.exchange_code(code, _spotify_redirect_uri(config))
    except SpotifyError:
        return RedirectResponse("/settings?spotify=error")
    await spotify.save_tokens(request.app.state.db, toks)
    return RedirectResponse("/settings?spotify=connected")


@api_router.post("/spotify/disconnect")
async def spotify_disconnect(request: Request):
    """Forget the user's Spotify tokens."""
    await spotify.clear_tokens(request.app.state.db)
    return {"ok": True}


# ── Pet / Den ─────────────────────────────────────────────────────────


async def _detect_brain(config) -> dict:
    """Best-effort: is there a mind for the companion? (local Ollama or a cloud key)"""
    import os

    import httpx

    ollama = False
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            ollama = resp.status_code == 200
    except (httpx.HTTPError, OSError):
        ollama = False  # Ollama not running — expected, not an error
    cloud_keys = any(
        pc.api_key_env and os.environ.get(pc.api_key_env)
        for pc in config.providers.values()
    )
    return {"ollama": ollama, "cloud_keys": cloud_keys}


@api_router.get("/pet")
async def get_pet(request: Request):
    """The companion, or null before hatch (first-run signal), plus brain detection."""
    pet = await xp.get_pet(request.app.state.db)
    brain = await _detect_brain(request.app.state.config)
    return {"pet": pet, "brain": brain}


@api_router.get("/vision")
async def get_vision(request: Request):
    """Whether the companion can see a screen, and whether doing so sends it
    off-device — so the UI can warn before capturing. Resolves the `vision`
    role against live key presence + a local-model probe."""
    import os

    config = request.app.state.config
    key_present = {
        name: bool(pc.api_key_env and os.environ.get(pc.api_key_env))
        for name, pc in config.providers.items()
    }
    local_up = (await _detect_brain(config))["ollama"]
    return resolve_vision(config, key_present, local_up)


@api_router.get("/den")
async def den(request: Request):
    """Den digest: pet, recent light (xp_events), and what's grown."""
    db = request.app.state.db
    pet = await xp.get_pet(db)
    cur = await db.execute(
        "SELECT type, amount, ref, created_at FROM xp_events ORDER BY id DESC LIMIT 20"
    )
    recent_xp = [dict(r) for r in await cur.fetchall()]
    cur = await db.execute(
        "SELECT COUNT(*) AS n FROM memories WHERE superseded_by IS NULL"
    )
    memory_count = (await cur.fetchone())["n"]
    cur = await db.execute("SELECT COUNT(*) AS n FROM skills WHERE status = 'active'")
    skill_count = (await cur.fetchone())["n"]
    cur = await db.execute("SELECT summary_md FROM journal ORDER BY day DESC LIMIT 1")
    last_journal_row = await cur.fetchone()
    last_journal = last_journal_row["summary_md"] if last_journal_row else None
    return {
        "pet": pet,
        "recent_xp": recent_xp,
        "memory_count": memory_count,
        "skill_count": skill_count,
        "last_journal": last_journal,
    }


@api_router.get("/skills")
async def list_skills(request: Request):
    """The companion's approved (active) skills — drives the village's earned monuments."""
    return {"skills": await skill_loader.list_active(request.app.state.db)}


class HatchRequest(BaseModel):
    creature_name: str = Field(min_length=1, max_length=40)
    user_name: str = Field(default="", max_length=40)
    voice: str = Field(default="warm", max_length=20)
    focus: str = Field(default="", max_length=500)
    boundaries: str = Field(default="", max_length=500)


@api_router.post("/hatch")
async def hatch(body: HatchRequest, request: Request):
    """First-run ritual: birth the companion. 409 if already hatched."""
    db = request.app.state.db
    if await xp.get_pet(db) is not None:
        raise HTTPException(409, "Already hatched")
    pet = await hatch_svc.hatch(
        db,
        SOUL_PATH,
        creature_name=body.creature_name,
        user_name=body.user_name,
        voice=body.voice,
        focus=body.focus,
        boundaries=body.boundaries,
    )
    return {"pet": pet}


@api_router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """Local fallback STT using faster-whisper. Used by Tauri shells where Web Speech API STT is unavailable."""
    from ..voice import whisper
    try:
        content = await file.read()
        text = await whisper.transcribe_audio(content)
        return {"text": text}
    except Exception as e:
        log.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Autonomy ──────────────────────────────────────────────────────────

@api_router.get("/proactive")
async def list_proactive(request: Request):
    cur = await request.app.state.db.execute(
        "SELECT id, session_id, text, kind, engaged, created_at FROM proactive_messages ORDER BY id DESC LIMIT 30"
    )
    return {"messages": [dict(r) for r in await cur.fetchall()]}

@api_router.post("/proactive/{msg_id}/engage")
async def engage_proactive(msg_id: int, request: Request):
    db = request.app.state.db
    cur = await db.execute("UPDATE proactive_messages SET engaged = 1 WHERE id = ? AND engaged = 0", (msg_id,))
    await db.commit()
    if cur.rowcount > 0:
        await xp.award(db, "proactive_useful", ref=f"proactive_{msg_id}")
    return {"ok": True}

@api_router.get("/jobs/runs")
async def list_job_runs(request: Request):
    cur = await request.app.state.db.execute(
        "SELECT r.id, j.name, r.status, r.error, r.created_at "
        "FROM job_runs r JOIN jobs j ON r.job_id = j.id "
        "ORDER BY r.id DESC LIMIT 50"
    )
    return {"runs": [dict(r) for r in await cur.fetchall()]}

@api_router.get("/journal")
async def list_journals(request: Request):
    cur = await request.app.state.db.execute(
        "SELECT day, summary_md, mood, created_at FROM journal ORDER BY day DESC LIMIT 7"
    )
    return {"entries": [dict(r) for r in await cur.fetchall()]}

@api_router.get("/autonomy")
async def autonomy_status(request: Request):
    db = request.app.state.db
    config = request.app.state.config
    import datetime
    from ..core import autonomy_state
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    acts = await autonomy_state.acts_today(db, today)
    last_hb = await autonomy_state.last_heartbeat_at(db)
    
    return {
        "enabled": config.proactivity.enabled,
        "acts_today": acts,
        "max": config.proactivity.max_proactive_per_day,
        "quiet": False,
        "last_heartbeat_at": last_hb.isoformat() if last_hb else None
    }


# ── Chat ──────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=100_000)
    session_id: str | None = None
    role: str = "primary"
    # Optional screen/image the companion should look at. Base64 (raw or a data:
    # URL). Sent to the vision model for this turn only — never written to history.
    image_b64: str | None = Field(default=None, max_length=15_000_000)
    # Optional concrete "provider/model" override; None => role-based routing.
    model: str | None = None


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@api_router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    db = request.app.state.db
    router = request.app.state.router
    registry = request.app.state.registry
    config = request.app.state.config

    if req.role not in config.roles:
        raise HTTPException(400, f"Unknown role {req.role!r}")

    # An attached image needs a vision-capable model: prefer a configured `vision`
    # role, else keep the requested one (e.g. a vision-capable `primary`).
    role = "vision" if req.image_b64 and "vision" in config.roles else req.role

    # An explicit model override (when set) wins over role routing in run_turn.
    if req.model is not None:
        try:
            provider_name, _ = parse_ref(req.model)
        except ValueError:
            raise HTTPException(400, f"Invalid model ref {req.model!r}")
        if provider_name not in config.providers:
            raise HTTPException(400, f"Unknown model ref {req.model!r}")

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

    async def stream():
        yield _sse({"type": "session", "session_id": session_id})
        final_text = ""
        async for event in agent.run_turn(
            db=db,
            router=router,
            registry=registry,
            config=config,
            session_id=session_id,
            user_text=req.message,
            role=role,
            image_b64=req.image_b64,
            model=req.model,
            synapse=_synapse,
        ):
            if event.type == "delta":
                yield _sse({"type": "delta", "text": event.text})
            elif event.type == "tool_start":
                yield _sse({"type": "tool_start", "tool": event.tool, "detail": event.detail})
            elif event.type == "tool_end":
                yield _sse(
                    {"type": "tool_end", "tool": event.tool, "detail": event.detail,
                     "ok": event.ok}
                )
                if event.ok:
                    await xp.award(db, "tool_ok", ref=event.tool)
            elif event.type == "done":
                final_text = event.text
                yield _sse({"type": "done"})
                await xp.award(db, "conversation", ref=session_id)
            elif event.type == "error":
                yield _sse({"type": "error", "message": event.text})

        if final_text and config.agent.extract_memories:
            task = asyncio.create_task(
                extractor.extract_from_exchange(
                    db, router,
                    session_id=session_id,
                    user_text=req.message,
                    assistant_text=final_text,
                )
            )
            task.add_done_callback(_log_extraction_failure)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _log_extraction_failure(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception():
        log.error("memory extraction task failed", exc_info=task.exception())


# ── Sessions ──────────────────────────────────────────────────────────


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
        "SELECT id, role, content, tool_calls_json, created_at FROM messages"
        " WHERE session_id = ? ORDER BY id",
        (session_id,),
    )
    return {"messages": [dict(r) for r in await cur.fetchall()]}


@api_router.delete("/sessions/{session_id}")
async def archive_session(session_id: str, request: Request):
    cur = await request.app.state.db.execute(
        "UPDATE sessions SET archived = 1 WHERE id = ?", (session_id,)
    )
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such session")
    return {"ok": True}


# ── Memory ────────────────────────────────────────────────────────────


class MemoryCreate(BaseModel):
    type: str
    content: str = Field(min_length=2, max_length=500)


class MemoryUpdate(BaseModel):
    content: str = Field(min_length=2, max_length=500)


@api_router.get("/memory")
async def list_memory(request: Request, q: str = "", type: str | None = None):
    if q.strip():
        memories = await store.search_memories(request.app.state.db, q, top_k=50)
        if type:
            memories = [m for m in memories if m.type == type]
    else:
        memories = await store.list_memories(request.app.state.db, type=type)
    return {"memories": [m.__dict__ for m in memories]}


@api_router.get("/memory/graph")
async def memory_graph(request: Request):
    """The Living Memory Web: nodes + similarity edges over the kept memories."""
    return await store.memory_graph(request.app.state.db)


@api_router.post("/memory")
async def create_memory(body: MemoryCreate, request: Request):
    if body.type not in store.MEMORY_TYPES:
        raise HTTPException(400, f"type must be one of {store.MEMORY_TYPES}")
    memory_id = await store.add_memory(
        request.app.state.db, type=body.type, content=body.content
    )
    return {"id": memory_id, "deduplicated": memory_id is None}


@api_router.put("/memory/{memory_id}")
async def edit_memory(memory_id: int, body: MemoryUpdate, request: Request):
    ok = await store.update_memory(request.app.state.db, memory_id, body.content)
    if not ok:
        raise HTTPException(404, "No such memory")
    return {"ok": True}


@api_router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: int, request: Request):
    ok = await store.forget_memory(request.app.state.db, memory_id)
    if not ok:
        raise HTTPException(404, "No such memory")
    return {"ok": True}


# ── Profile ───────────────────────────────────────────────────────────


class ProfileEntry(BaseModel):
    key: str = Field(min_length=1, max_length=60)
    value: str = Field(max_length=500)


@api_router.get("/profile")
async def get_profile(request: Request):
    cur = await request.app.state.db.execute(
        "SELECT key, value, updated_at FROM user_profile ORDER BY key"
    )
    return {"profile": [dict(r) for r in await cur.fetchall()]}


@api_router.put("/profile")
async def set_profile(body: ProfileEntry, request: Request):
    db = request.app.state.db
    if body.value.strip():
        await db.execute(
            "INSERT INTO user_profile (key, value) VALUES (?, ?)"
            " ON CONFLICT(key) DO UPDATE SET value = excluded.value,"
            " updated_at = datetime('now')",
            (body.key, body.value),
        )
    else:
        await db.execute("DELETE FROM user_profile WHERE key = ?", (body.key,))
    await db.commit()
    return {"ok": True}


# ── Notes ─────────────────────────────────────────────────────────────


class NoteBody(BaseModel):
    title: str = Field(max_length=200)
    content_md: str = Field(default="", max_length=100_000)


@api_router.get("/notes")
async def list_notes(request: Request, q: str = ""):
    db = request.app.state.db
    if q.strip():
        terms = " OR ".join(
            f'"{t.replace(chr(34), chr(34) * 2)}"' for t in q.split() if t.strip()
        )
        cur = await db.execute(
            "SELECT n.id, n.title, n.content_md, n.created_at, n.updated_at"
            " FROM notes_fts f JOIN notes n ON n.id = f.rowid"
            " WHERE notes_fts MATCH ? ORDER BY rank LIMIT 100",
            (terms,),
        )
    else:
        cur = await db.execute(
            "SELECT id, title, content_md, created_at, updated_at FROM notes"
            " ORDER BY updated_at DESC LIMIT 200"
        )
    return {"notes": [dict(r) for r in await cur.fetchall()]}


@api_router.post("/notes")
async def create_note(body: NoteBody, request: Request):
    cur = await request.app.state.db.execute(
        "INSERT INTO notes (title, content_md) VALUES (?, ?)",
        (body.title, body.content_md),
    )
    await request.app.state.db.commit()
    return {"id": cur.lastrowid}


@api_router.put("/notes/{note_id}")
async def update_note(note_id: int, body: NoteBody, request: Request):
    cur = await request.app.state.db.execute(
        "UPDATE notes SET title = ?, content_md = ?, updated_at = datetime('now')"
        " WHERE id = ?",
        (body.title, body.content_md, note_id),
    )
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such note")
    return {"ok": True}


@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: int, request: Request):
    cur = await request.app.state.db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    await request.app.state.db.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "No such note")
    return {"ok": True}
