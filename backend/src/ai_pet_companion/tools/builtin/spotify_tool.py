"""Spotify playback tools: play a song, and control the transport.

Works with **no Premium and no login** by default: a song is resolved with
client-credentials search and opened via a ``spotify:track:<id>`` deep link, and
play/pause/skip ride the OS media keys (the Spotify desktop app obeys them). If
the user *has* linked their account (Premium) we prefer the precise Web API.

NETWORK_SENSITIVE tier, allowed via ``trust.auto_approve_tools``.
"""

import asyncio
from typing import Literal
from urllib.parse import quote

from pydantic import BaseModel, Field

from ...core.synapse import synapse
from ...integrations import media_keys, spotify
from ...integrations.spotify import SpotifyClient, SpotifyError
from ..registry import Registry, Risk, ToolContext, tool
from . import actions

# pause/resume can't be distinguished by a media key â€” both toggle play/pause.
_MEDIA = {"pause": "playpause", "resume": "playpause", "next": "next", "previous": "previous"}
_VERB = {
    "pause": "Paused",
    "resume": "Resumed",
    "next": "Skipped to the next track",
    "previous": "Went to the previous track",
}


class PlayMusicParams(BaseModel):
    query: str = Field(
        min_length=1, description="Song to play, e.g. 'Come Down by The Kid Laroi'"
    )


class ControlPlaybackParams(BaseModel):
    action: Literal["pause", "resume", "next", "previous"]


async def _launch(target: str) -> None:
    """Launch a spotify: URI off the event loop (shared shell-free launcher)."""
    await asyncio.to_thread(actions.spawn, target)


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="play_music",
        description="Search Spotify and play a song (opens/plays it in the Spotify app).",
        risk=Risk.NETWORK_SENSITIVE,
    )
    async def play_music(params: PlayMusicParams, ctx: ToolContext) -> str:
        q = params.query
        # 1) Linked account (Premium): precise Web API playback on the active device.
        if await spotify.load_tokens(ctx.db) is not None:
            try:
                client = SpotifyClient(ctx.db)
                track = await client.search_track(q)
                if track is None:
                    return f"Couldn't find â€œ{q}â€ on Spotify."
                await client.play_uri(track["uri"])
                synapse.publish("spotify.playing", track=track["name"], artist=track["artist"])
                return f"â™ª Playing {track['name']} â€” {track['artist']}."
            except SpotifyError:
                pass  # fall through to the no-Premium path
        # 2) App credentials: resolve the exact track and deep-link it (no Premium/login).
        if spotify.configured():
            try:
                track = await spotify.search_track_public(q)
            except SpotifyError:
                track = None
            if track:
                await _launch(f"spotify:track:{track['id']}")
                synapse.publish("spotify.playing", track=track["name"], artist=track["artist"])
                return f"â™ª Playing {track['name']} â€” {track['artist']} in Spotify."
        # 3) Zero-setup fallback: open Spotify on the search results.
        await _launch(f"spotify:search:{quote(q)}")
        return (
            f"Opened Spotify search for â€œ{q}â€. Add SPOTIFY_CLIENT_ID/SECRET to .env to "
            "auto-play the exact track."
        )

    @tool(
        registry,
        name="control_playback",
        description="Control Spotify playback: pause, resume, next, or previous track.",
        risk=Risk.NETWORK_SENSITIVE,
    )
    async def control_playback(params: ControlPlaybackParams, ctx: ToolContext) -> str:
        action = params.action
        # Linked account: precise Web API control.
        if await spotify.load_tokens(ctx.db) is not None:
            try:
                await SpotifyClient(ctx.db).command(action)
                return f"{_VERB[action]}."
            except SpotifyError:
                pass  # fall back to media keys
        # No-setup path: global media key (the Spotify desktop app obeys it).
        try:
            await asyncio.to_thread(media_keys.send_media_key, _MEDIA[action])
        except Exception as e:  # noqa: BLE001 â€” Windows-only / unknown key
            return f"Couldn't control playback: {e}"
        if action in ("pause", "resume"):
            return "Sent play/pause to Spotify."
        return f"{_VERB[action]}."
