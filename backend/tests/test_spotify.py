"""Spotify client + play_music / control_playback tools. No real network.

Default (no linked account): client-credentials search + spotify: deep link, and
media keys for transport. When a user token is stored: the precise Web API.
"""

from pathlib import Path

import httpx
import pytest

from ai_pet_companion.config import MIGRATIONS_DIR, Config
from ai_pet_companion.db import migrate, open_db
from ai_pet_companion.integrations import spotify
from ai_pet_companion.integrations.spotify import SpotifyClient, SpotifyError, TokenSet
from ai_pet_companion.tools import build_registry
from ai_pet_companion.tools.registry import ToolContext

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
    return ToolContext(
        db=db, config=Config.model_validate(SPOTIFY_CFG), router=None,
        session_id="s1", workspace=tmp_path / "ws",
    )


@pytest.fixture
def creds(monkeypatch):
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "id")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "secret")
    spotify._app_token.update({"token": "", "expires_at": 0.0})  # reset cache


@pytest.fixture
def launches(monkeypatch) -> list[str]:
    calls: list[str] = []
    monkeypatch.setattr("ai_pet_companion.tools.builtin.actions.spawn", lambda t: calls.append(t))
    return calls


@pytest.fixture
def media(monkeypatch) -> list[str]:
    calls: list[str] = []
    monkeypatch.setattr("ai_pet_companion.integrations.media_keys.send_media_key", lambda a: calls.append(a))
    return calls


@pytest.fixture
def events(monkeypatch) -> list[tuple]:
    evs: list[tuple] = []
    monkeypatch.setattr(
        "ai_pet_companion.tools.builtin.spotify_tool.synapse.publish",
        lambda etype, **payload: evs.append((etype, payload)),
    )
    return evs


# â”€â”€ token store / refresh / search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


async def test_access_token_refreshes_when_expired(db, creds, monkeypatch):
    await spotify.save_tokens(
        db, TokenSet("old", "refresh-tok", expires_at=0.0, scope=spotify.SCOPES)
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert b"grant_type=refresh_token" in request.content
        return httpx.Response(200, json={"access_token": "new-tok", "expires_in": 3600})

    monkeypatch.setattr(spotify, "_TRANSPORT", httpx.MockTransport(handler))
    assert await SpotifyClient(db)._access_token() == "new-tok"
    assert (await spotify.load_tokens(db)).refresh_token == "refresh-tok"  # preserved


async def test_access_token_without_login_raises(db, creds):
    with pytest.raises(SpotifyError):
        await SpotifyClient(db)._access_token()


async def test_status_reports_not_connected(db):
    assert (await SpotifyClient(db).status())["connected"] is False


async def test_search_track_public_uses_app_token(creds, monkeypatch):
    def handler(req: httpx.Request) -> httpx.Response:
        if str(req.url).startswith(spotify.TOKEN_URL):
            return httpx.Response(200, json={"access_token": "app-tok", "expires_in": 3600})
        return httpx.Response(
            200,
            json={"tracks": {"items": [
                {"id": "abc", "uri": "spotify:track:abc", "name": "Calm Down",
                 "artists": [{"name": "Rema"}]}
            ]}},
        )

    monkeypatch.setattr(spotify, "_TRANSPORT", httpx.MockTransport(handler))
    t = await spotify.search_track_public("calm down")
    assert t == {"id": "abc", "uri": "spotify:track:abc", "name": "Calm Down", "artist": "Rema"}


# â”€â”€ play_music â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


async def test_play_music_deeplinks_exact_track(ctx, creds, launches, events, monkeypatch):
    async def fake_search(q):
        return {"id": "abc", "uri": "spotify:track:abc", "name": "Calm Down", "artist": "Rema"}

    monkeypatch.setattr(spotify, "search_track_public", fake_search)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "calm down"}')
    assert res.ok and "Calm Down" in res.content
    assert launches == ["spotify:track:abc"]
    assert events == [("spotify.playing", {"track": "Calm Down", "artist": "Rema"})]


async def test_play_music_opens_search_without_creds(ctx, launches, monkeypatch):
    monkeypatch.delenv("SPOTIFY_CLIENT_ID", raising=False)
    monkeypatch.delenv("SPOTIFY_CLIENT_SECRET", raising=False)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "calm down"}')
    assert "Opened Spotify search" in res.content
    assert launches == ["spotify:search:calm%20down"]


async def test_play_music_webapi_when_linked(ctx, db, creds, events, monkeypatch):
    await spotify.save_tokens(db, TokenSet("a", "r", expires_at=9e18, scope=spotify.SCOPES))

    async def fake_search(self, q):
        return {"uri": "spotify:track:1", "name": "Calm Down", "artist": "Rema"}

    async def fake_play(self, uri):
        assert uri == "spotify:track:1"

    monkeypatch.setattr(SpotifyClient, "search_track", fake_search)
    monkeypatch.setattr(SpotifyClient, "play_uri", fake_play)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "play_music", '{"query": "calm down"}')
    assert "Playing Calm Down" in res.content and "in Spotify" not in res.content
    assert events == [("spotify.playing", {"track": "Calm Down", "artist": "Rema"})]


# â”€â”€ control_playback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


async def test_control_playback_uses_media_keys(ctx, media):
    reg = build_registry(ctx.config)
    pause = await reg.dispatch(ctx, "control_playback", '{"action": "pause"}')
    nxt = await reg.dispatch(ctx, "control_playback", '{"action": "next"}')
    assert pause.ok and "play/pause" in pause.content
    assert "next" in nxt.content
    assert media == ["playpause", "next"]


async def test_control_playback_webapi_when_linked(ctx, db, media, monkeypatch):
    await spotify.save_tokens(db, TokenSet("a", "r", expires_at=9e18, scope=spotify.SCOPES))
    calls: list[str] = []

    async def fake_cmd(self, action):
        calls.append(action)

    monkeypatch.setattr(SpotifyClient, "command", fake_cmd)
    reg = build_registry(ctx.config)
    res = await reg.dispatch(ctx, "control_playback", '{"action": "pause"}')
    assert res.ok and "Paused" in res.content
    assert calls == ["pause"] and media == []  # used Web API, not media keys
