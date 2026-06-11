"""Tool registry and builtin tool tests."""

from pathlib import Path

import pytest
from pydantic import BaseModel

from neuraclaw.config import MIGRATIONS_DIR, Config
from neuraclaw.db import migrate, open_db
from neuraclaw.tools import build_registry
from neuraclaw.tools.registry import Registry, Risk, ToolContext, tool


@pytest.fixture
async def ctx(tmp_path: Path):
    db = await open_db(tmp_path / "test.db")
    await migrate(db, MIGRATIONS_DIR)
    config = Config()
    yield ToolContext(
        db=db, config=config, router=None, session_id="s1", workspace=tmp_path / "ws"
    )
    await db.close()


def make_registry(max_risk: Risk = Risk.WRITE) -> Registry:
    config = Config.model_validate({"trust": {"max_auto_risk": int(max_risk)}})
    return build_registry(config)


async def test_registry_has_expected_tools():
    registry = make_registry()
    names = set(registry.tools)
    assert {
        "read_file", "write_file", "list_dir", "run_shell",
        "web_fetch", "web_search", "remember", "forget",
        "search_memory", "search_history", "create_note", "search_notes",
    } <= names


async def test_schemas_are_valid_openai_shape():
    registry = make_registry()
    for schema in registry.schemas():
        assert schema["type"] == "function"
        fn = schema["function"]
        assert fn["name"] and fn["description"]
        assert fn["parameters"]["type"] == "object"


async def test_file_roundtrip_inside_workspace(ctx):
    registry = make_registry()
    result = await registry.dispatch(ctx, "write_file", '{"path": "a.txt", "content": "hi"}')
    assert result.ok
    result = await registry.dispatch(ctx, "read_file", '{"path": "a.txt"}')
    assert result.ok and result.content == "hi"


async def test_path_escape_rejected(ctx):
    registry = make_registry()
    result = await registry.dispatch(
        ctx, "write_file", '{"path": "../escape.txt", "content": "x"}'
    )
    assert not result.ok
    assert "escapes" in result.content


async def test_high_risk_tool_refused_below_threshold(ctx):
    registry = make_registry(Risk.WRITE)  # run_shell is EXECUTE
    result = await registry.dispatch(ctx, "run_shell", '{"command": "echo hi"}')
    assert not result.ok
    assert "approval" in result.content


async def test_high_risk_tool_allowed_when_trusted(ctx):
    registry = make_registry(Risk.EXECUTE)
    result = await registry.dispatch(ctx, "run_shell", '{"command": "echo hi"}')
    assert result.ok
    assert "hi" in result.content


async def test_unknown_tool_and_bad_args(ctx):
    registry = make_registry()
    result = await registry.dispatch(ctx, "nope", "{}")
    assert not result.ok
    result = await registry.dispatch(ctx, "read_file", '{"wrong": 1}')
    assert not result.ok


async def test_invocations_are_audited(ctx):
    registry = make_registry()
    await registry.dispatch(ctx, "list_dir", "{}")
    cur = await ctx.db.execute("SELECT tool_name FROM tool_invocations")
    rows = await cur.fetchall()
    assert [r["tool_name"] for r in rows] == ["list_dir"]


async def test_duplicate_registration_rejected():
    registry = Registry()

    class P(BaseModel):
        pass

    @tool(registry, name="t", description="d", risk=Risk.READ)
    async def t1(params: P, ctx) -> str:
        return ""

    with pytest.raises(ValueError):

        @tool(registry, name="t", description="d", risk=Risk.READ)
        async def t2(params: P, ctx) -> str:
            return ""
