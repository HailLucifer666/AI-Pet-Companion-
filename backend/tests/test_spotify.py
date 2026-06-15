"""Spotify client (token refresh) + play_music / control_playback tools. No real network."""

from pathlib import Path

import httpx
import pytest

from neuraclaw.config import MIGRATIONS_DIR, Config
from neuraclaw.db import migrate, open_db
from neuraclaw.integrations import spotify
from neuraclaw.integrations.spotify import SpotifyClient, SpotifyError, TokenSet
from neuraclaw.tools import build_registry
from neuraclaw.tools.registry import ToolContext

SPOTIFY_CFG = {
    "trust": {"max_auto_risk": 1, "auto_approve_tools": ["play_music", "control_playback"]},
}


@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()


@pytest.fixture
async def ctx(db, tmp_path: Path):
    config = Config.model_validate(SPOTIFY_CFG)
    return ToolContext(
        db=db, config=config, router=None, session_id="s1", workspace=tmp_path / "ws"
    )


@pytest.fixture
def creds(monkeypatch):
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "id")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "secret")


# ── token store / refresh ─────────────────────────────────────────────


async def test_access_token_refreshes_when_expired(db, creds, monkeypatch):
    await spotify.save_tokens(
        db, TokenSet("old", "refresh-tok", expires_at=0.0, scope=spotify.SCOPES)
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == spotify.TOKEN_URL
        assert b"grant_type=refresh_token" in request.content
        return httpx.Response(200, json={"access_token": "new-tok", "expires_in": 3600})

    monkeypatch.setattr(spotify, "_TRANSPORT", httpx.MockTransport(handler))

    token = await SpotifyClient(db)._access_token()
    assert token == "new-tok"
    stored = await spotify.load_tokens(db)
    assert stored.access_token == "new-tok"
    assert stored.refresh_token == "refresh-tok"  # preserved across refresh


async def test_access_token_without_login_raises(db, creds):
    with pytest.raises(SpotifyError):
        await SpotifyClient(db)._access_token()


async def test_status_reports_not_connected(db):
    assert (await SpotifyClient(db).status())["connected"] is False


# ── tools ─────────────────────────────────────────────────────────────


async def test_play_music_plays_and_emits_event(ctx, creds, monkeypatch):
    async def fake_search(self, q):
        return {"uri": "spotify:track:1", "name": "Come Down", "artist": "The Kid Laroi"}

    async def fake_play(self, uri):
        assert uri == "spotify:track:1"

    monkeypatch.setattr(SpotifyClient, "search_track", fake_search)
    monkeypatch.setattr(SpotifyClient, "play_uri", fake_play)
    events: list[tuple] = []
    monkeypatch.setattr(
        "neuraclaw.tools.builtin.spotify_tool.synapse.publish",
        lambda etype, **payload: events.append((etype, payload)),
    )

    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "Come Down by The Kid Laroi"}')
    assert res.ok
    assert "Playing Come Down" in res.content
    assert events == [("spotify.playing", {"track": "Come Down", "artist": "The Kid Laroi"})]


async def test_play_music_not_configured(ctx, monkeypatch):
    monkeypatch.delenv("SPOTIFY_CLIENT_ID", raising=False)
    monkeypatch.delenv("SPOTIFY_CLIENT_SECRET", raising=False)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "x"}')
    assert "isn't set up" in res.content


async def test_play_music_not_found(ctx, creds, monkeypatch):
    async def fake_search(self, q):
        return None

    monkeypatch.setattr(SpotifyClient, "search_track", fake_search)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "zzzz"}')
    assert "Couldn't find" in res.content


async def test_play_music_surfaces_premium_error(ctx, creds, monkeypatch):
    async def fake_search(self, q):
        return {"uri": "u", "name": "n", "artist": "a"}

    async def fake_play(self, uri):
        raise SpotifyError("Controlling playback needs Spotify Premium.")

    monkeypatch.setattr(SpotifyClient, "search_track", fake_search)
    monkeypatch.setattr(SpotifyClient, "play_uri", fake_play)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "x"}')
    assert "Premium" in res.content


async def test_control_playback_pause(ctx, creds, monkeypatch):
    calls: list[str] = []

    async def fake_cmd(self, action):
        calls.append(action)

    monkeypatch.setattr(SpotifyClient, "command", fake_cmd)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "control_playback", '{"action": "pause"}')
    assert res.ok and "Paused" in res.content
    assert calls == ["pause"]
