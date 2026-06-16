"""Model Context Protocol (MCP) Client Manager.

Connects to local MCP servers via stdio and registers their tools with the agent.
"""

import asyncio
import logging
from contextlib import AsyncExitStack
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from pydantic import BaseModel

from ..config import Config
from ..tools.registry import Registry, Risk, ToolContext, ToolDef

log = logging.getLogger(__name__)


def _make_params_model(schema: dict[str, Any], name: str) -> type[BaseModel]:
    """Create a dynamic BaseModel that claims the MCP tool's JSON schema."""

    class DynamicParams(BaseModel):
        model_config = {"extra": "allow"}

        @classmethod
        def model_json_schema(cls, **kwargs) -> dict[str, Any]:
            return schema

    DynamicParams.__name__ = f"{name.title()}Params"
    return DynamicParams


class McpManager:
    """Manages connections to MCP servers and injects their tools into the registry."""

    def __init__(self, config: Config):
        self.config = config
        self._stack = AsyncExitStack()
        self._sessions: dict[str, ClientSession] = {}

    async def start(self, registry: Registry) -> None:
        """Start all configured MCP servers and register their tools."""
        if not self.config.mcp.servers:
            return

        log.info("Starting MCP Manager...")

        for server_name, server_config in self.config.mcp.servers.items():
            try:
                log.info(f"Connecting to MCP server: {server_name}...")
                params = StdioServerParameters(
                    command=server_config.command,
                    args=server_config.args,
                    env=server_config.env or None,
                )
                
                # We use AsyncExitStack to keep the context managers alive
                read_stream, write_stream = await self._stack.enter_async_context(stdio_client(params))
                session = await self._stack.enter_async_context(ClientSession(read_stream, write_stream))
                
                await session.initialize()
                self._sessions[server_name] = session
                
                # Fetch and register tools
                tools_response = await session.list_tools()
                for mcp_tool in tools_response.tools:
                    self._register_mcp_tool(server_name, session, mcp_tool, registry)
                
                log.info(f"Successfully connected to MCP server '{server_name}' and registered {len(tools_response.tools)} tools.")
            except Exception as e:
                log.error(f"Failed to start MCP server '{server_name}': {e}")

    def _register_mcp_tool(
        self, server_name: str, session: ClientSession, mcp_tool: Any, registry: Registry
    ) -> None:
        """Wrap an MCP tool in a ToolDef and register it."""
        tool_name = f"{server_name}_{mcp_tool.name}"
        schema = mcp_tool.inputSchema
        params_model = _make_params_model(schema, tool_name)

        async def func(params: BaseModel, ctx: ToolContext) -> str:
            # Pydantic v2 model_dump includes extra fields if extra="allow"
            args_dict = params.model_dump()
            try:
                result = await session.call_tool(mcp_tool.name, arguments=args_dict)
                # MCP tools return a list of content objects (text, image, etc.)
                outputs = []
                for content in result.content:
                    if content.type == "text":
                        outputs.append(content.text)
                    else:
                        outputs.append(f"[{content.type} content]")
                return "\n".join(outputs)
            except Exception as e:
                log.exception(f"MCP tool {tool_name} failed")
                return f"MCP tool error: {e}"

        tool_def = ToolDef(
            name=tool_name,
            description=mcp_tool.description or f"MCP tool {mcp_tool.name} from {server_name}",
            risk=Risk.EXECUTE,  # All MCP tools are EXECUTE tier by default
            params_model=params_model,
            func=func,
            source=f"mcp:{server_name}",
        )
        registry.register(tool_def)

    async def stop(self) -> None:
        """Close all MCP connections."""
        log.info("Stopping MCP Manager...")
        await self._stack.aclose()
        self._sessions.clear()
