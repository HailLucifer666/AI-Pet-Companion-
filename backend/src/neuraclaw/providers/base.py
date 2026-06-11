"""Provider protocol and shared chat types.

All configured backends (NIM, OpenRouter, Ollama) speak the OpenAI
chat-completions dialect, so there is one implementation (openai_compat.py)
instantiated per provider. This module defines the shapes everything
upstream (agent loop, router) depends on.
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ToolCall:
    id: str
    name: str
    arguments_json: str


@dataclass
class ChatResponse:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    model: str = ""


@dataclass
class Delta:
    """One streaming chunk. Exactly one field is meaningful per event."""

    text: str = ""
    tool_call: ToolCall | None = None
    done: bool = False
    response: ChatResponse | None = None  # set on the final done delta


class Provider(Protocol):
    name: str

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        tools: list[dict[str, Any]] | None = None,
    ) -> ChatResponse: ...

    def chat_stream(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[Delta]: ...


class ProviderError(Exception):
    """Raised when a provider call fails; router catches this for failover."""


class ToolsUnsupportedError(ProviderError):
    """Raised instead of silently dropping tools on a model that can't use them."""
