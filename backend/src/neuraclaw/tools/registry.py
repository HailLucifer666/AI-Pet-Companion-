"""Tool registry: decorator registration, risk tiers, schema generation, dispatch.

Three tool sources (builtins now, skills and MCP later) share this interface;
the agent loop never knows the difference.
"""

import inspect
import json
import logging
import time
from dataclasses import dataclass, field
from enum import IntEnum
from pathlib import Path
from typing import Any, Awaitable, Callable

import aiosqlite
from pydantic import BaseModel, ValidationError

from ..config import Config
from ..providers import Router

log = logging.getLogger(__name__)


class Risk(IntEnum):
    READ = 0
    WRITE = 1
    EXECUTE = 2
    NETWORK_SENSITIVE = 3


@dataclass
class ToolContext:
    db: aiosqlite.Connection
    config: Config
    router: Router
    session_id: str
    workspace: Path


ToolFunc = Callable[[BaseModel, ToolContext], Awaitable[str]]


@dataclass
class ToolDef:
    name: str
    description: str
    risk: Risk
    params_model: type[BaseModel]
    func: ToolFunc
    source: str = "builtin"

    def schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.params_model.model_json_schema(),
            },
        }


@dataclass
class ToolResult:
    name: str
    content: str
    ok: bool = True


@dataclass
class Registry:
    tools: dict[str, ToolDef] = field(default_factory=dict)
    max_auto_risk: Risk = Risk.WRITE

    def register(self, tool: ToolDef) -> None:
        if tool.name in self.tools:
            raise ValueError(f"Duplicate tool {tool.name!r}")
        self.tools[tool.name] = tool

    def schemas(self) -> list[dict[str, Any]]:
        return [t.schema() for t in self.tools.values()]

    async def dispatch(
        self, ctx: ToolContext, name: str, arguments_json: str
    ) -> ToolResult:
        tool = self.tools.get(name)
        if tool is None:
            return ToolResult(name, f"Unknown tool {name!r}", ok=False)
        if tool.risk > self.max_auto_risk:
            # Phase 2 brings the approval flow; until then high-risk tools are refused.
            return ToolResult(
                name,
                f"Tool {name!r} requires user approval (risk {tool.risk.name}),"
                " which is not available yet. Tell the user what you wanted to do"
                " and ask them to do it manually or adjust trust settings.",
                ok=False,
            )
        try:
            params = tool.params_model.model_validate_json(arguments_json or "{}")
        except ValidationError as e:
            return ToolResult(name, f"Invalid arguments: {e}", ok=False)

        start = time.monotonic()
        try:
            output = await tool.func(params, ctx)
            result = ToolResult(name, output)
        except Exception as e:  # tool bugs must not kill the agent loop
            log.exception("tool %s failed", name)
            result = ToolResult(name, f"Tool error: {e}", ok=False)
        await self._audit(ctx, tool, arguments_json, result, start)
        return result

    async def _audit(
        self,
        ctx: ToolContext,
        tool: ToolDef,
        args_json: str,
        result: ToolResult,
        start: float,
    ) -> None:
        try:
            await ctx.db.execute(
                "INSERT INTO tool_invocations"
                " (session_id, tool_name, source, args_json, result_summary, duration_ms)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (
                    ctx.session_id,
                    tool.name,
                    tool.source,
                    args_json[:2000],
                    result.content[:500],
                    int((time.monotonic() - start) * 1000),
                ),
            )
            await ctx.db.commit()
        except aiosqlite.Error:
            log.exception("tool audit insert failed")


def tool(registry: Registry, *, name: str, description: str, risk: Risk):
    """Register an async function (params: BaseModel, ctx: ToolContext) -> str."""

    def decorate(func: ToolFunc) -> ToolFunc:
        sig = inspect.signature(func)
        params_type = list(sig.parameters.values())[0].annotation
        if not (isinstance(params_type, type) and issubclass(params_type, BaseModel)):
            raise TypeError(f"{func.__name__} first param must be a BaseModel subclass")
        registry.register(
            ToolDef(
                name=name,
                description=description,
                risk=risk,
                params_model=params_type,
                func=func,
            )
        )
        return func

    return decorate


def truncate(text: str, limit: int = 8000) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n... [truncated, {len(text)} chars total]"


def args_summary(arguments_json: str, limit: int = 120) -> str:
    """Compact human-readable args for UI tool-activity rows."""
    try:
        data = json.loads(arguments_json or "{}")
        s = ", ".join(f"{k}={v!r}" for k, v in data.items())
    except json.JSONDecodeError:
        s = arguments_json
    return s[:limit]
