"""Spotify Web API client + OAuth token store.

Authorization Code flow (loopback redirect) for a local desktop app. Client
credentials come from ``SPOTIFY_CLIENT_ID`` / ``SPOTIFY_CLIENT_SECRET`` in
``.env``; the user's access/refresh tokens live in the local ``spotify_oauth``
table (per-machine, never synced, never logged or returned to the client).

Playback control (``PUT /me/player/play`` etc.) requires Spotify **Premium** and
an active device — failures are mapped to clear, user-facing messages.
"""

from __future__ import annotations

import base64
import logging
import os
import time
from dataclasses import dataclass

import aiosqlite
import httpx

log = logging.getLogger(__name__)

AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"  # noqa: S105 (URL, not a secret)
API_BASE = "https://api.spotify.com/v1"
SCOPES = "user-read-playback-state user-modify-playback-state"
TIMEOUT = 10.0

# Test seam: when set, used as the httpx transport (httpx.MockTransport in tests).
_TRANSPORT: httpx.AsyncBaseTransport | None = None


class SpotifyError(Exception):
    """A problem whose message is safe to surface to the user."""


@dataclass
class TokenSet:
    access_token: str
    refresh_token: str
    expires_at: float  # epoch seconds
    scope: str


def client_id() -> str:
    return os.environ.get("SPOTIFY_CLIENT_ID", "")


def client_secret() -> str:
    return os.environ.get("SPOTIFY_CLIENT_SECRET", "")


def configured() -> bool:
    """True when the app credentials are present (independent of user login)."""
    return bool(client_id() and client_secret())


def _basic_auth() -> str:
    raw = f"{client_id()}:{client_secret()}".encode()
    return "Basic " + base64.b64encode(raw).decode()


def _http() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=TIMEOUT, transport=_TRANSPORT)


# ── Token store (single row, id=1) ────────────────────────────────────


async def load_tokens(db: aiosqlite.Connection) -> TokenSet | None:
    cur = await db.execute(
        "SELECT access_token, refresh_token, expires_at, scope FROM spotify_oauth WHERE id = 1"
    )
    row = await cur.fetchone()
    if row is None:
        return None
    return TokenSet(
        access_token=row["access_token"],
        refresh_token=row["refresh_token"],
        expires_at=row["expires_at"],
        scope=row["scope"],
    )


async def save_tokens(db: aiosqlite.Connection, toks: TokenSet) -> None:
    await db.execute(
        "INSERT INTO spotify_oauth (id, access_token, refresh_token, expires_at, scope, updated_at)"
        " VALUES (1, ?, ?, ?, ?, datetime('now'))"
        " ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token,"
        " refresh_token = excluded.refresh_token, expires_at = excluded.expires_at,"
        " scope = excluded.scope, updated_at = datetime('now')",
        (toks.access_token, toks.refresh_token, toks.expires_at, toks.scope),
    )
    await db.commit()


async def clear_tokens(db: aiosqlite.Connection) -> None:
    await db.execute("DELETE FROM spotify_oauth WHERE id = 1")
    await db.commit()


# ── OAuth handshake ───────────────────────────────────────────────────


def authorize_url(redirect_uri: str, state: str) -> str:
    from urllib.parse import urlencode

    params = {
        "response_type": "code",
        "client_id": client_id(),
        "scope": SCOPES,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def _token_set_from_payload(data: dict, *, fallback_refresh: str = "") -> TokenSet:
    # Refresh responses may omit refresh_token — keep the existing one.
    return TokenSet(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token") or fallback_refresh,
        expires_at=time.time() + float(data.get("expires_in", 3600)),
        scope=data.get("scope", SCOPES),
    )


async def exchange_code(code: str, redirect_uri: str) -> TokenSet:
    async with _http() as http:
        resp = await http.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Authorization": _basic_auth()},
        )
    if resp.status_code != 200:
        raise SpotifyError("Spotify rejected the login. Please try connecting again.")
    return _token_set_from_payload(resp.json())


# ── Authenticated client ──────────────────────────────────────────────


class SpotifyClient:
    """Per-call client bound to the DB token store. Cheap to construct."""

    def __init__(self, db: aiosqlite.Connection) -> None:
        self.db = db

    async def _access_token(self) -> str:
        toks = await load_tokens(self.db)
        if toks is None:
            raise SpotifyError(
                "Spotify isn't connected yet — open Settings and click Connect Spotify."
            )
        if toks.expires_at <= time.time() + 30:
            toks = await self._refresh(toks)
        return toks.access_token

    async def _refresh(self, toks: TokenSet) -> TokenSet:
        async with _http() as http:
            resp = await http.post(
                TOKEN_URL,
                data={"grant_type": "refresh_token", "refresh_token": toks.refresh_token},
                headers={"Authorization": _basic_auth()},
            )
        if resp.status_code != 200:
            raise SpotifyError(
                "Spotify login expired — please reconnect in Settings."
            )
        new = _token_set_from_payload(resp.json(), fallback_refresh=toks.refresh_token)
        await save_tokens(self.db, new)
        return new

    async def _api(self, method: str, path: str, *, retry: bool = True, **kwargs) -> httpx.Response:
        token = await self._access_token()
        async with _http() as http:
            resp = await http.request(
                method, f"{API_BASE}{path}",
                headers={"Authorization": f"Bearer {token}"}, **kwargs,
            )
        if resp.status_code == 401 and retry:
            # Token rejected mid-flight — force a refresh and try once more.
            toks = await load_tokens(self.db)
            if toks:
                await self._refresh(toks)
            return await self._api(method, path, retry=False, **kwargs)
        return resp

    # — playback —

    async def search_track(self, query: str) -> dict | None:
        resp = await self._api("GET", "/search", params={"q": query, "type": "track", "limit": 1})
        if resp.status_code != 200:
            raise SpotifyError("Couldn't search Spotify right now.")
        items = resp.json().get("tracks", {}).get("items", [])
        if not items:
            return None
        t = items[0]
        return {
            "uri": t["uri"],
            "name": t["name"],
            "artist": ", ".join(a["name"] for a in t.get("artists", [])),
        }

    async def _first_device_id(self) -> str | None:
        resp = await self._api("GET", "/me/player/devices")
        if resp.status_code != 200:
            return None
        devices = resp.json().get("devices", [])
        if not devices:
            return None
        active = next((d for d in devices if d.get("is_active")), devices[0])
        return active.get("id")

    async def play_uri(self, uri: str) -> None:
        resp = await self._api("PUT", "/me/player/play", json={"uris": [uri]})
        if resp.status_code == 404:  # no active device — pick one and retry
            device_id = await self._first_device_id()
            if not device_id:
                raise SpotifyError(
                    "No Spotify device is open. Start Spotify on your phone or computer, then ask again."
                )
            resp = await self._api(
                "PUT", "/me/player/play", params={"device_id": device_id}, json={"uris": [uri]}
            )
        self._raise_for_playback(resp)

    async def command(self, action: str) -> None:
        """pause | resume | next | previous."""
        if action == "pause":
            resp = await self._api("PUT", "/me/player/pause")
        elif action == "resume":
            resp = await self._api("PUT", "/me/player/play")
        elif action == "next":
            resp = await self._api("POST", "/me/player/next")
        elif action == "previous":
            resp = await self._api("POST", "/me/player/previous")
        else:
            raise SpotifyError(f"Unknown playback action {action!r}.")
        self._raise_for_playback(resp)

    @staticmethod
    def _raise_for_playback(resp: httpx.Response) -> None:
        if resp.status_code in (200, 202, 204):
            return
        if resp.status_code == 403:
            raise SpotifyError("Controlling playback needs Spotify Premium.")
        if resp.status_code == 404:
            raise SpotifyError(
                "No Spotify device is open. Start Spotify on a device, then ask again."
            )
        raise SpotifyError("Spotify wouldn't accept that just now — try again in a moment.")

    async def status(self) -> dict:
        """Connection + account snapshot for the Settings UI (no secrets)."""
        if await load_tokens(self.db) is None:
            return {"connected": False, "configured": configured()}
        try:
            me = await self._api("GET", "/me")
            devices = await self._api("GET", "/me/player/devices")
        except SpotifyError:
            return {"connected": False, "configured": configured()}
        profile = me.json() if me.status_code == 200 else {}
        device_list = devices.json().get("devices", []) if devices.status_code == 200 else []
        active = next((d["name"] for d in device_list if d.get("is_active")), None)
        return {
            "connected": True,
            "configured": configured(),
            "premium": profile.get("product") == "premium",
            "display_name": profile.get("display_name"),
            "active_device": active or (device_list[0]["name"] if device_list else None),
        }
