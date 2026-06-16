"""Model discovery + explicit (override) routing — no role failover, tools still gated."""

import pytest

from neuraclaw.config import Config, ProviderConfig
from neuraclaw.providers import ProviderError, Router, ToolsUnsupportedError
from neuraclaw.providers.base import ChatResponse, Delta
from neuraclaw.providers.openai_compat import OpenAICompatProvider


def make_config(**overrides) -> Config:
    base = {
        "providers": {
            "a": ProviderConfig(base_url="http://a.local/v1"),
            "b": ProviderConfig(base_url="http://b.local/v1"),
        },
        "roles": {"primary": ["a/model-1", "b/model-2"]},
        "no_tools_models": ["model-2"],
    }
    base.update(overrides)
    return Config.model_validate(base)


# ── OpenAICompatProvider.list_models ──────────────────────────────────


class _FakeModel:
    def __init__(self, id_: str):
        self.id = id_


class _FakePage:
    def __init__(self, data):
        self.data = data


class _FakeModels:
    def __init__(self, page=None, error: Exception | None = None):
        self._page, self._error = page, error

    async def list(self):
        if self._error:
            raise self._error
        return self._page


class _FakeClient:
    def __init__(self, models: _FakeModels):
        self.models = models


async def test_list_models_maps_id_to_ref():
    prov = OpenAICompatProvider("nim", "http://x/v1", "k")
    prov._client = _FakeClient(_FakeModels(_FakePage([_FakeModel("meta/llama-3.3"), _FakeModel("m2")])))
    assert await prov.list_models() == [
        {"id": "meta/llama-3.3", "ref": "nim/meta/llama-3.3"},
        {"id": "m2", "ref": "nim/m2"},
    ]


async def test_list_models_raises_provider_error_on_failure():
    prov = OpenAICompatProvider("nim", "http://x/v1", "k")
    prov._client = _FakeClient(_FakeModels(error=RuntimeError("network down")))
    with pytest.raises(ProviderError):  # unreachable != empty; message carries no detail
        await prov.list_models()


# ── Router.list_provider_models ───────────────────────────────────────


class FakeStreamProvider:
    def __init__(self, name: str, models=None):
        self.name = name
        self._models = models or []
        self.stream_calls = 0

    async def list_models(self):
        return self._models

    async def chat_stream(self, messages, *, model, tools=None):
        self.stream_calls += 1
        yield Delta(text="po")
        yield Delta(text="ng")
        yield Delta(done=True, response=ChatResponse(text="pong", model=model))


async def test_list_provider_models_unknown_returns_none():
    router = Router(make_config())
    router._providers = {"a": FakeStreamProvider("a", [{"id": "m1", "ref": "a/m1"}])}
    assert await router.list_provider_models("zzz") is None  # unknown => unreachable


async def test_list_provider_models_distinguishes_empty_from_unreachable():
    class Bad:
        name = "b"

        async def list_models(self):
            raise RuntimeError("boom")

        async def chat_stream(self, messages, *, model, tools=None):
            yield Delta(done=True)

    router = Router(make_config())
    good = FakeStreamProvider("a", [{"id": "m1", "ref": "a/m1"}])
    empty = FakeStreamProvider("c", [])  # reachable, advertises nothing
    router._providers = {"a": good, "b": Bad(), "c": empty}
    assert await router.list_provider_models("a") == [{"id": "m1", "ref": "a/m1"}]
    assert await router.list_provider_models("b") is None  # error => unreachable
    assert await router.list_provider_models("c") == []  # reachable but empty


# ── Router.chat_stream_explicit ───────────────────────────────────────


async def _drain(gen):
    return [d async for d in gen]


async def test_chat_stream_explicit_streams_and_yields_final_response():
    router = Router(make_config())
    fp = FakeStreamProvider("a")
    router._providers = {"a": fp, "b": FakeStreamProvider("b")}
    deltas = await _drain(
        router.chat_stream_explicit("a", "model-1", [{"role": "user", "content": "hi"}])
    )
    assert "".join(d.text for d in deltas if d.text) == "pong"
    assert deltas[-1].done and deltas[-1].response.text == "pong"
    assert fp.stream_calls == 1


async def test_chat_stream_explicit_unknown_provider_raises():
    router = Router(make_config())
    router._providers = {"a": FakeStreamProvider("a")}
    with pytest.raises(ProviderError, match="Unknown provider"):
        await _drain(router.chat_stream_explicit("zzz", "m", []))


async def test_chat_stream_explicit_enforces_no_tools_models():
    router = Router(make_config())  # no_tools_models = ["model-2"]
    router._providers = {"b": FakeStreamProvider("b")}
    with pytest.raises(ToolsUnsupportedError):
        await _drain(
            router.chat_stream_explicit(
                "b", "model-2", [], tools=[{"type": "function", "function": {"name": "t"}}]
            )
        )


async def test_chat_stream_explicit_has_no_failover():
    """A failing explicit model raises — it must NOT fall back to another provider."""

    class Failing:
        name = "a"

        async def list_models(self):
            return []

        async def chat_stream(self, messages, *, model, tools=None):
            raise ProviderError("a down")
            yield  # pragma: no cover — makes this an async generator

    router = Router(make_config())
    b = FakeStreamProvider("b")
    router._providers = {"a": Failing(), "b": b}
    with pytest.raises(ProviderError, match="a down"):
        await _drain(router.chat_stream_explicit("a", "model-1", []))
    assert b.stream_calls == 0  # never reached the other provider
