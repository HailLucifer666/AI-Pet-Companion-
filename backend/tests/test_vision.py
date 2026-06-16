"""Vision-brain resolution: which model sees a screen, and whether it's remote."""

from neuraclaw.config import Config
from neuraclaw.core.vision import is_local_url, resolve_vision


def make_config() -> Config:
    return Config.model_validate(
        {
            "providers": {
                "openrouter": {
                    "base_url": "https://openrouter.ai/api/v1",
                    "api_key_env": "OPENROUTER_API_KEY",
                },
                "ollama": {"base_url": "http://localhost:11434/v1"},
            },
            "roles": {
                "vision": ["openrouter/anthropic/claude-sonnet-4.6", "ollama/llama3.2-vision"]
            },
        }
    )


def test_is_local_url():
    assert is_local_url("http://localhost:11434/v1")
    assert is_local_url("http://127.0.0.1:8080")
    assert not is_local_url("https://openrouter.ai/api/v1")


def test_prefers_remote_when_its_key_is_present():
    # First in the chain wins when usable — and it's remote (screen leaves device).
    out = resolve_vision(make_config(), {"openrouter": True}, local_up=True)
    assert out["available"] is True
    assert out["remote"] is True
    assert out["model"] == "anthropic/claude-sonnet-4.6"
    assert out["provider"] == "openrouter"


def test_falls_back_to_local_when_no_cloud_key():
    # No cloud key → the local Ollama vision model carries it, fully on-device.
    out = resolve_vision(make_config(), {"openrouter": False}, local_up=True)
    assert out["available"] is True
    assert out["remote"] is False
    assert out["model"] == "llama3.2-vision"
    assert out["provider"] == "ollama"


def test_unavailable_when_nothing_runs():
    out = resolve_vision(make_config(), {"openrouter": False}, local_up=False)
    assert out == {"available": False, "remote": False, "model": None, "provider": None}


def test_unavailable_when_no_vision_role():
    cfg = Config.model_validate(
        {"providers": {"ollama": {"base_url": "http://localhost:11434/v1"}}, "roles": {}}
    )
    out = resolve_vision(cfg, {}, local_up=True)
    assert out["available"] is False
