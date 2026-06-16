import pytest

from neuraclaw.config import Config, ProviderConfig
from neuraclaw.providers import ProviderError, Router, ToolsUnsupportedError, parse_ref
from neuraclaw.providers.base import ChatResponse


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


class FakeProvider:
    def __init__(self, name: str, fail: bool = False):
        self.name = name
        self.fail = fail
        self.calls = 0

    async def chat(self, messages, *, model, tools=None):
        self.calls += 1
        if self.fail:
            raise ProviderError(f"{self.name} down")
        return ChatResponse(text=f"from {self.name}", model=model)

    async def chat_stream(self, messages, *, model, tools=None):
        raise NotImplementedError


def test_parse_ref_splits_on_first_slash():
    assert parse_ref("openrouter/anthropic/claude-sonnet-4.6") == (
        "openrouter",
        "anthropic/claude-sonnet-4.6",
    )
    with pytest.raises(ValueError):
        parse_ref("no-slash")


async def test_failover_to_next_provider():
    router = Router(make_config())
    a, b = FakeProvider("a", fail=True), FakeProvider("b")
    router._providers = {"a": a, "b": b}
    resp = await router.chat("primary", [{"role": "user", "content": "hi"}])
    assert resp.text == "from b"
    assert a.calls == 1 and b.calls == 1


async def test_all_failed_raises():
    router = Router(make_config())
    router._providers = {"a": FakeProvider("a", fail=True), "b": FakeProvider("b", fail=True)}
    with pytest.raises(ProviderError, match="All providers failed"):
        await router.chat("primary", [{"role": "user", "content": "hi"}])


async def test_no_tools_model_refused():
    config = make_config(roles={"primary": ["b/model-2"]})
    router = Router(config)
    router._providers = {"b": FakeProvider("b")}
    with pytest.raises(ToolsUnsupportedError):
        await router.chat(
            "primary",
            [{"role": "user", "content": "hi"}],
            tools=[{"type": "function", "function": {"name": "t"}}],
        )


def test_unknown_role_raises():
    router = Router(make_config())
    with pytest.raises(ValueError, match="No models configured"):
        router.chain("nonexistent")
