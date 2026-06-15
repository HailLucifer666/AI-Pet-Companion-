"""Agent loop tests with a scripted fake provider."""

from pathlib import Path
from unittest.mock import patch

import pytest

from neuraclaw.config import MIGRATIONS_DIR, Config
from neuraclaw.core import agent
from neuraclaw.core.context import build_user_content
from neuraclaw.db import migrate, open_db
from neuraclaw.providers.base import ChatResponse, Delta, ToolCall
from neuraclaw.tools import build_registry


class ScriptedRouter:
    """Yields pre-scripted responses, one per chat_stream / chat_stream_explicit call."""

    def __init__(self, responses: list[ChatResponse]):
        self.responses = list(responses)
        self.calls: list[list[dict]] = []
        self.explicit_calls: list[tuple[str, str]] = []

    async def _emit(self, resp):
        for chunk in resp.text.split(" "):
            if chunk:
                yield Delta(text=chunk + " ")
        yield Delta(done=True, response=resp)

    async def chat_stream(self, role, messages, *, tools=None):
        self.calls.append(messages)
        async for d in self._emit(self.responses.pop(0)):
            yield d

    async def chat_stream_explicit(self, provider_name, model, messages, *, tools=None):
        self.explicit_calls.append((provider_name, model))
        async for d in self._emit(self.responses.pop(0)):
            yield d


async def fake_embed(texts: list[str]) -> list[list[float]]:
    return [[0.0] * 384 for _ in texts]


@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    await conn.execute("INSERT INTO sessions (id) VALUES ('s1')")
    await conn.execute(
        "INSERT INTO messages (session_id, role, content) VALUES ('s1', 'user', 'hello')"
    )
    await conn.commit()
    with patch("neuraclaw.memory.embedder.embed", side_effect=fake_embed):
        yield conn
    await conn.close()


def make_config() -> Config:
    return Config.model_validate({"agent": {"extract_memories": False}})


async def collect(gen):
    return [e async for e in gen]


async def test_plain_text_turn(db, tmp_path):
    config = make_config()
    router = ScriptedRouter([ChatResponse(text="hi there friend")])
    events = await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="hello",
        )
    )
    assert events[-1].type == "done"
    assert "hi there friend" in events[-1].text
    # Assistant reply persisted.
    cur = await db.execute(
        "SELECT content FROM messages WHERE session_id='s1' AND role='assistant'"
    )
    rows = await cur.fetchall()
    assert len(rows) == 1


async def test_tool_call_roundtrip(db, tmp_path):
    config = make_config()
    tool_call = ToolCall(id="c1", name="write_file",
                         arguments_json='{"path": "x.txt", "content": "data"}')
    router = ScriptedRouter([
        ChatResponse(text="", tool_calls=[tool_call]),
        ChatResponse(text="wrote the file"),
    ])
    events = await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="write x.txt",
        )
    )
    types = [e.type for e in events]
    assert "tool_start" in types and "tool_end" in types
    assert events[-1].type == "done"
    # Second model call saw the tool result message.
    assert any(m.get("role") == "tool" for m in router.calls[1])


async def test_step_budget_exhaustion(db, tmp_path):
    config = Config.model_validate(
        {"agent": {"max_steps": 2, "extract_memories": False}}
    )
    tc = ToolCall(id="c", name="list_dir", arguments_json="{}")
    router = ScriptedRouter([
        ChatResponse(text="", tool_calls=[tc]),
        ChatResponse(text="", tool_calls=[tc]),
    ])
    events = await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="loop forever",
        )
    )
    assert events[-1].type == "error"
    assert "2 steps" in events[-1].text


async def test_model_override_routes_through_explicit_path(db, tmp_path):
    """A concrete `model` ref bypasses role routing (chat_stream_explicit), no role call."""
    config = make_config()
    router = ScriptedRouter([ChatResponse(text="explicit answer")])
    events = await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="hello",
            model="openrouter/anthropic/claude-sonnet-4.6",
        )
    )
    assert events[-1].type == "done"
    assert "explicit answer" in events[-1].text
    assert router.explicit_calls == [("openrouter", "anthropic/claude-sonnet-4.6")]
    assert router.calls == []  # the role-based path was not used


async def test_no_model_uses_role_path(db, tmp_path):
    """Without a model override, the role chat_stream path is used (explicit untouched)."""
    config = make_config()
    router = ScriptedRouter([ChatResponse(text="role answer")])
    await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="hello",
        )
    )
    assert router.explicit_calls == []
    assert len(router.calls) == 1


async def test_system_prompt_contains_soul(db, tmp_path):
    config = make_config()
    router = ScriptedRouter([ChatResponse(text="ok")])
    await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="hello",
        )
    )
    system = router.calls[0][0]
    assert system["role"] == "system"
    # The system prompt embeds SOUL.md verbatim. Assert against the live file
    # (newline-normalized) rather than a brand literal, so persona rewrites of
    # SOUL.md don't break this test — it verifies the soul is injected, not its wording.
    soul = (Path(__file__).resolve().parents[2] / "SOUL.md").read_text(encoding="utf-8")

    def norm(s: str) -> str:
        return s.replace("\r\n", "\n").replace("\r", "\n").strip()

    assert norm(soul) in norm(system["content"])


def test_build_user_content_plain_text():
    # No image → a plain string (the common, unchanged path).
    assert build_user_content("hello", None) == "hello"
    assert build_user_content("hello", "") == "hello"


def test_build_user_content_wraps_bare_base64():
    content = build_user_content("what is this?", "AAAABBBB")
    assert isinstance(content, list)
    text_part, image_part = content
    assert text_part == {"type": "text", "text": "what is this?"}
    assert image_part["type"] == "image_url"
    assert image_part["image_url"]["url"] == "data:image/png;base64,AAAABBBB"


def test_build_user_content_passes_through_data_url():
    url = "data:image/jpeg;base64,ZZZZ"
    content = build_user_content("look", url)
    assert content[1]["image_url"]["url"] == url  # used as-is, not double-wrapped


async def test_image_attaches_to_latest_user_message(db, tmp_path):
    config = make_config()
    router = ScriptedRouter([ChatResponse(text="that's a cat")])
    events = await collect(
        agent.run_turn(
            db=db, router=router, registry=build_registry(config), config=config,
            session_id="s1", user_text="hello", image_b64="PNGDATA",
        )
    )
    assert events[-1].type == "done"
    # The model saw a multimodal user message carrying the image.
    user_msgs = [m for m in router.calls[0] if m.get("role") == "user"]
    content = user_msgs[-1]["content"]
    assert isinstance(content, list)
    assert any(
        p.get("type") == "image_url" and "PNGDATA" in p["image_url"]["url"]
        for p in content
    )
    # The image is never persisted to history — only the text is stored.
    cur = await db.execute(
        "SELECT content FROM messages WHERE session_id='s1' AND role='user'"
    )
    rows = await cur.fetchall()
    assert all("PNGDATA" not in r["content"] for r in rows)
