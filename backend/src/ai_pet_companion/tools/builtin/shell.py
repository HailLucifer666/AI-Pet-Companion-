"""Shell execution: contained subprocess, stripped env, timeout, output cap.

This is containment, not a sandbox â€” risk tier EXECUTE means it is refused
until the user's trust settings allow it (or the Phase-2 approval flow lands).
"""

import asyncio
import os

from pydantic import BaseModel, Field

from ..registry import Registry, Risk, ToolContext, tool, truncate

TIMEOUT_SECONDS = 30
# Minimal env: no API keys or user secrets reach subprocesses.
SAFE_ENV_KEYS = ("SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "TEMP", "TMP", "COMSPEC")


class RunShellParams(BaseModel):
    command: str = Field(description="Shell command to run inside the workspace")


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="run_shell",
        description="Run a shell command in the workspace. Output is captured.",
        risk=Risk.EXECUTE,
    )
    async def run_shell(params: RunShellParams, ctx: ToolContext) -> str:
        env = {k: v for k, v in os.environ.items() if k.upper() in SAFE_ENV_KEYS}
        ctx.workspace.mkdir(parents=True, exist_ok=True)
        proc = await asyncio.create_subprocess_shell(
            params.command,
            cwd=ctx.workspace,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=TIMEOUT_SECONDS)
        except TimeoutError:
            proc.kill()
            return f"Command timed out after {TIMEOUT_SECONDS}s"
        text = out.decode("utf-8", errors="replace")
        return truncate(f"[exit {proc.returncode}]\n{text}")
