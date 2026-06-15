"""Spotify playback tools: play a song, and control the transport.

NETWORK_SENSITIVE tier (acts on the user's account over the network), allowed to
run via ``trust.auto_approve_tools``. The OAuth grant the user gave in Settings is
the authorization; these only touch the user's own playback — no data leaves.
"""

from typing import Literal

from pydantic import BaseModel, Field

from ...core.synapse import synapse
from ...integrations import spotify
from ...integrations.spotify import SpotifyClient, SpotifyError
from ..registry import Registry, Risk, ToolContext, tool

_NOT_SET = (
    "Spotify isn't set up. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env, "
    "then click Connect Spotify in Settings."
)


class PlayMusicParams(BaseModel):
    query: str = Field(
        min_length=1, description="Song to play, e.g. 'Come Down by The Kid Laroi'"
    )


class ControlPlaybackParams(BaseModel):
    action: Literal["pause", "resume", "next", "previous"]


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="play_music",
        description="Search Spotify and play a song on the user's active device.",
        risk=Risk.NETWORK_SENSITIVE,
    )
    async def play_music(params: PlayMusicParams, ctx: ToolContext) -> str:
        if not spotify.configured():
            return _NOT_SET
        client = SpotifyClient(ctx.db)
        try:
            track = await client.search_track(params.query)
            if track is None:
                return f"Couldn't find “{params.query}” on Spotify."
            await client.play_uri(track["uri"])
        except SpotifyError as e:
            return str(e)
        synapse.publish("spotify.playing", track=track["name"], artist=track["artist"])
        return f"♪ Playing {track['name']} — {track['artist']}."

    @tool(
        registry,
        name="control_playback",
        description="Control Spotify playback: pause, resume, next, or previous track.",
        risk=Risk.NETWORK_SENSITIVE,
    )
    async def control_playback(params: ControlPlaybackParams, ctx: ToolContext) -> str:
        if not spotify.configured():
            return _NOT_SET
        client = SpotifyClient(ctx.db)
        try:
            await client.command(params.action)
        except SpotifyError as e:
            return str(e)
        verb = {
            "pause": "Paused",
            "resume": "Resumed",
            "next": "Skipped to the next track",
            "previous": "Went to the previous track",
        }[params.action]
        return f"{verb}."
