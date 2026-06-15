"""Single Provider implementation for any OpenAI-compatible endpoint."""

import logging
from collections.abc import AsyncIterator
from typing import Any

from openai import APIError, AsyncOpenAI

from .base import ChatResponse, Delta, ProviderError, ToolCall

log = logging.getLogger(__name__)


class OpenAICompatProvider:
    def __init__(self, name: str, base_url: str, api_key: str):
        self.name = name
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key or "missing")

    async def list_models(self) -> list[dict[str, Any]]:
        """Discover the models this provider advertises (OpenAI ``GET /v1/models``).

        Returns ``[]`` only when the provider genuinely advertises no models; raises
        ``ProviderError`` if the provider is unreachable/keyless so callers can tell
        "empty" apart from "down". Only the exception *type* is logged â€” never key or
        error-body text. (The router swallows this into a ``None`` reachability signal;
        it never reaches a client.)
        """
        try:
            page = await self._client.models.list()
            return [{"id": m.id, "ref": f"{self.name}/{m.id}"} for m in page.data]
        except Exception as e:  # noqa: BLE001
            log.warning("list_models failed for %s: %s", self.name, type(e).__name__)
            raise ProviderError(f"{self.name}: model discovery failed") from e

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        tools: list[dict[str, Any]] | None = None,
    ) -> ChatResponse:
        try:
            resp = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools or None,
            )
        except APIError as e:
            raise ProviderError(f"{self.name}/{model}: {e}") from e
        choice = resp.choices[0].message
        usage = resp.usage
        return ChatResponse(
            text=choice.content or "",
            tool_calls=[
                ToolCall(id=tc.id, name=tc.function.name, arguments_json=tc.function.arguments)
                for tc in (choice.tool_calls or [])
            ],
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
            model=model,
        )

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[Delta]:
        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools or None,
                stream=True,
            )
        except APIError as e:
            raise ProviderError(f"{self.name}/{model}: {e}") from e

        full_text: list[str] = []
        # Tool-call fragments accumulate by index across chunks.
        pending_tools: dict[int, dict[str, str]] = {}
        try:
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta is None:
                    continue
                if delta.content:
                    full_text.append(delta.content)
                    yield Delta(text=delta.content)
                for tc in delta.tool_calls or []:
                    slot = pending_tools.setdefault(
                        tc.index, {"id": "", "name": "", "args": ""}
                    )
                    if tc.id:
                        slot["id"] = tc.id
                    if tc.function and tc.function.name:
                        slot["name"] = tc.function.name
                    if tc.function and tc.function.arguments:
                        slot["args"] += tc.function.arguments
        except APIError as e:
            raise ProviderError(f"{self.name}/{model}: {e}") from e

        tool_calls = [
            ToolCall(id=t["id"], name=t["name"], arguments_json=t["args"])
            for _, t in sorted(pending_tools.items())
        ]
        response = ChatResponse(text="".join(full_text), tool_calls=tool_calls, model=model)
        for tc in tool_calls:
            yield Delta(tool_call=tc)
        yield Delta(done=True, response=response)
