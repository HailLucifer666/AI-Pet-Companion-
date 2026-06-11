"""Workspace-scoped file tools. Path guard rejects anything outside the workspace."""

from pathlib import Path

from pydantic import BaseModel, Field

from ..registry import Registry, Risk, ToolContext, tool, truncate


def _resolve_guarded(workspace: Path, raw: str) -> Path:
    """Resolve a user/model-supplied path inside the workspace, or raise."""
    candidate = (workspace / raw).resolve()
    workspace = workspace.resolve()
    if candidate != workspace and workspace not in candidate.parents:
        raise PermissionError(f"Path {raw!r} escapes the workspace")
    return candidate


class ReadFileParams(BaseModel):
    path: str = Field(description="Path relative to the workspace directory")


class WriteFileParams(BaseModel):
    path: str = Field(description="Path relative to the workspace directory")
    content: str


class ListDirParams(BaseModel):
    path: str = Field(default=".", description="Directory relative to the workspace")


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="read_file",
        description="Read a text file from the agent workspace.",
        risk=Risk.READ,
    )
    async def read_file(params: ReadFileParams, ctx: ToolContext) -> str:
        path = _resolve_guarded(ctx.workspace, params.path)
        if not path.is_file():
            return f"No such file: {params.path}"
        return truncate(path.read_text(encoding="utf-8", errors="replace"))

    @tool(
        registry,
        name="write_file",
        description="Write a text file into the agent workspace (overwrites).",
        risk=Risk.WRITE,
    )
    async def write_file(params: WriteFileParams, ctx: ToolContext) -> str:
        path = _resolve_guarded(ctx.workspace, params.path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(params.content, encoding="utf-8")
        return f"Wrote {len(params.content)} chars to {params.path}"

    @tool(
        registry,
        name="list_dir",
        description="List files in a workspace directory.",
        risk=Risk.READ,
    )
    async def list_dir(params: ListDirParams, ctx: ToolContext) -> str:
        path = _resolve_guarded(ctx.workspace, params.path)
        if not path.is_dir():
            return f"No such directory: {params.path}"
        entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name))
        lines = [f"{'  ' if e.is_file() else 'd '}{e.name}" for e in entries[:200]]
        return "\n".join(lines) or "(empty)"
