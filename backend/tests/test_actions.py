"""open_url / open_app tools + the auto-approve allowlist gate."""

import json
from pathlib import Path

import pytest

from ai_pet_companion.config import MIGRATIONS_DIR, Config
from ai_pet_companion.db import migrate, open_db
from ai_pet_companion.tools import build_registry
from ai_pet_companion.tools.registry import ToolContext

ACTIONS_CONFIG = {
    "trust": {"max_auto_risk": 1, "auto_approve_tools": ["open_url", "open_app"]},
    "actions": {"url_schemes": ["http", "https"], "apps": {"spotify": "spotify:"}},
}


@pytest.fixture
async def ctx(tmp_path: Path):
    db = await open_db(tmp_path / "test.db")
    await migrate(db, MIGRATIONS_DIR)
    config = Config.model_validate(ACTIONS_CONFIG)
    yield ToolContext(
        db=db, config=config, router=None, session_id="s1", workspace=tmp_path / "ws"
    )
    await db.close()


@pytest.fixture
def captured(monkeypatch) -> list[str]:
    """Capture launch targets instead of really opening anything."""
    calls: list[str] = []
    monkeypatch.setattr(
        "ai_pet_companion.tools.builtin.actions.spawn", lambda target: calls.append(target)
    )
    return calls


async def test_open_url_opens_https(ctx, captured):
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "open_url", '{"url": "https://youtube.com"}')
    assert res.ok
    assert captured == ["https://youtube.com"]


@pytest.mark.parametrize(
    "url",
    [
        "file:///c:/secret.txt",
        "javascript:alert(1)",
        "data:text/html,<h1>x</h1>",
        "https:///",  # no host
    ],
)
async def test_open_url_refuses_dangerous_or_malformed(ctx, captured, url):
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "open_url", json.dumps({"url": url}))
    # Refusal travels in content (codebase convention); the security fact is
    # that nothing was launched.
    assert "Refused" in res.content
    assert captured == []  # never launched


async def test_open_app_opens_whitelisted(ctx, captured):
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "open_app", '{"name": "spotify"}')
    assert res.ok
    assert captured == ["spotify:"]


async def test_open_app_refuses_unlisted(ctx, captured):
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "open_app", '{"name": "calc"}')
    assert "not an allowed app" in res.content
    assert captured == []  # never launched


async def test_auto_approve_runs_action_but_run_shell_stays_refused(ctx, captured):
    """open_url is EXECUTE(2) > trust(1) yet runs (allow-listed); run_shell does not."""
    reg = build_registry(ctx.config)
    allowed = await reg.dispatch(ctx, "open_url", '{"url": "https://example.com"}')
    assert allowed.ok
    refused = await reg.dispatch(ctx, "run_shell", '{"command": "echo hi"}')
    assert not refused.ok
    assert "approval" in refused.content
