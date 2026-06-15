"""Local actions: open links and whitelisted apps. Shell-free launching only.

These reach outside the workspace, so they carry honest high risk tiers and run
only when named in ``trust.auto_approve_tools`` — never via a blanket trust raise,
and never through ``run_shell``. The allowlists in ``config.actions`` are the
security boundary: ``open_url`` restricts URL schemes, ``open_app`` restricts which
apps may launch. Nothing here is ever passed to a shell or built from a string
command, so a song title or URL cannot inject a command.
"""

import asyncio
import os
import subprocess
import sys
from urllib.parse import urlsplit

from pydantic import BaseModel, Field

from ..registry import Registry, Risk, ToolContext, tool


def spawn(target: str) -> None:
    """Launch a URI (browser/protocol handler) or an executable — fire-and-forget.

    No shell, no argument string: the only inputs are a config-allowlisted app
    target or a scheme-validated URL. Module-level so tests can monkeypatch it.
    """
    if sys.platform == "win32":
        # ShellExecute: opens URLs in the default browser, resolves protocol
        # handlers (e.g. ``spotify:``) and launches PATH apps — all detached.
        os.startfile(target)  # type: ignore[attr-defined]  # noqa: S606 (no shell)
        return
    is_uri = bool(urlsplit(target).scheme) and not os.path.isabs(target)
    if is_uri:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.Popen([opener, target], start_new_session=True)  # noqa: S603
        return
    subprocess.Popen([target], start_new_session=True)  # noqa: S603


class OpenUrlParams(BaseModel):
    url: str = Field(description="A full http(s) URL to open in the default browser")


class OpenAppParams(BaseModel):
    name: str = Field(description="Friendly name of an app from the allowed list, e.g. 'spotify'")


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="open_url",
        description="Open an http(s) link in the user's default web browser.",
        risk=Risk.EXECUTE,
    )
    async def open_url(params: OpenUrlParams, ctx: ToolContext) -> str:
        parts = urlsplit(params.url.strip())
        allowed = {s.lower() for s in ctx.config.actions.url_schemes}
        if parts.scheme.lower() not in allowed:
            return (
                f"Refused: only {sorted(allowed)} links may be opened, "
                f"not {parts.scheme or '(none)'!r}."
            )
        if not parts.netloc:
            return "Refused: that isn't a full URL (it needs a host, e.g. https://example.com)."
        await asyncio.to_thread(spawn, params.url.strip())
        return f"Opened {params.url.strip()} in the browser."

    @tool(
        registry,
        name="open_app",
        description=(
            "Open one of the user's allowed local apps by name (e.g. 'spotify'). "
            "Only apps the user has whitelisted can be opened."
        ),
        risk=Risk.EXECUTE,
    )
    async def open_app(params: OpenAppParams, ctx: ToolContext) -> str:
        apps = ctx.config.actions.apps
        name = params.name.strip()
        target = apps.get(name) or apps.get(name.lower())
        if not target:
            available = ", ".join(sorted(apps)) or "(none configured)"
            return (
                f"Refused: {name!r} is not an allowed app. "
                f"Allowed apps: {available}. Add it under actions.apps in config to enable."
            )
        await asyncio.to_thread(spawn, target)
        return f"Opened {name}."
