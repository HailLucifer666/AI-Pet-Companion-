"""Role-based model routing with failover.

Subsystems request a role ("primary", "cheap", "local"); the router walks
that role's failover chain of "provider/model" refs until one succeeds.
"""

import logging
import time
from collections.abc import AsyncIterator
from typing import Any

import aiosqlite

from ..config import Config
from .base import ChatResponse, Delta, Provider, ProviderError, ToolsUnsupportedError
from .openai_compat import OpenAICompatProvider

log = logging.getLogger(__name__)


def parse_ref(ref: str) -> tuple[str, str]:
    """'openrouter/anthropic/claude-sonnet-4.6' -> ('openrouter', 'anthropic/claude-sonnet-4.6')"""
    provider, _, model = ref.partition("/")
    if not provider or not model:
        raise ValueError(f"Bad model ref {ref!r}; expected 'provider/model'")
    return provider, model


class Router:
    def __init__(self, config: Config, db: aiosqlite.Connection | None = None):
        self._config = config
        self._db = db
        self._providers: dict[str, Provider] = {
            name: OpenAICompatProvider(name, pc.base_url, pc.api_key)
            for name, pc in config.providers.items()
        }

    def chain(self, role: str) -> list[tuple[Provider, str]]:
        refs = self._config.roles.get(role)
        if not refs:
            raise ValueError(f"No models configured for role {role!r}")
        out = []
        for ref in refs:
            provider_name, model = parse_ref(ref)
            provider = self._providers.get(provider_name)
            if provider is None:
                raise ValueError(f"Role {role!r} references unknown provider {provider_name!r}")
            out.append((provider, model))
        return out

    def _check_tools(self, model: str, tools: list[dict[str, Any]] | None) -> None:
        if tools and model in self._config.no_tools_models:
            raise ToolsUnsupportedError(f"{model} does not support tool calling")

    async def chat(
        self,
        role: str,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
    ) -> ChatResponse:
        errors: list[ProviderError] = []
        for provider, model in self.chain(role):
            try:
                self._check_tools(model, tools)
                start = time.monotonic()
                resp = await provider.chat(messages, model=model, tools=tools)
                await self._log_usage(provider.name, model, role, resp, start)
                return resp
            except ProviderError as e:
                log.warning("provider failed, trying next in chain: %s", e)
                errors.append(e)
        if errors and all(isinstance(e, ToolsUnsupportedError) for e in errors):
            raise ToolsUnsupportedError(
                f"No model in role {role!r} supports tool calling: {[str(e) for e in errors]}"
            )
        raise ProviderError(
            f"All providers failed for role {role!r}: {[str(e) for e in errors]}"
        )

    async def chat_stream(
        self,
        role: str,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[Delta]:
        errors: list[str] = []
        for provider, model in self.chain(role):
            self._check_tools(model, tools)
            start = time.monotonic()
            started_streaming = False
            try:
                async for delta in provider.chat_stream(messages, model=model, tools=tools):
                    started_streaming = True
                    if delta.done and delta.response:
                        await self._log_usage(provider.name, model, role, delta.response, start)
                    yield delta
                return
            except ProviderError as e:
                # Failover is only safe before any tokens reached the caller.
                if started_streaming:
                    raise
                log.warning("provider failed pre-stream, trying next: %s", e)
                errors.append(str(e))
        raise ProviderError(f"All providers failed for role {role!r}: {errors}")

    async def chat_stream_explicit(
        self,
        provider_name: str,
        model: str,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[Delta]:
        """Stream from one explicit provider/model, bypassing role failover.

        Backs the user-facing model override. There is intentionally NO failover â€”
        a single concrete model was chosen, so a ``ProviderError`` propagates rather
        than silently switching models. Tool restrictions are still enforced via
        ``_check_tools`` (the override cannot bypass ``no_tools_models``).
        """
        provider = self._providers.get(provider_name)
        if provider is None:
            raise ProviderError(f"Unknown provider {provider_name!r}")
        self._check_tools(model, tools)
        start = time.monotonic()
        async for delta in provider.chat_stream(messages, model=model, tools=tools):
            if delta.done and delta.response:
                await self._log_usage(provider_name, model, "explicit", delta.response, start)
            yield delta

    async def list_provider_models(self, provider_name: str) -> list[dict[str, Any]] | None:
        """A provider's advertised models, or ``None`` if it is unknown or unreachable.

        ``None`` (down / keyless / unknown) is kept distinct from ``[]`` (reachable but
        advertises no models) so the discovery endpoint can report reachability honestly.
        """
        provider = self._providers.get(provider_name)
        if provider is None:
            return None
        try:
            return await provider.list_models()
        except Exception:  # noqa: BLE001 â€” best-effort; None signals unreachable
            return None

    async def _log_usage(
        self, provider: str, model: str, role: str, resp: ChatResponse, start: float
    ) -> None:
        if self._db is None:
            return
        await self._db.execute(
            "INSERT INTO provider_usage"
            " (provider, model, role, prompt_tokens, completion_tokens, latency_ms)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                provider,
                model,
                role,
                resp.prompt_tokens,
                resp.completion_tokens,
                int((time.monotonic() - start) * 1000),
            ),
        )
        await self._db.commit()
