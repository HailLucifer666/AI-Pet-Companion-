"""Vision-brain resolution.

When the companion is asked to look at a screen, the chat routes to the `vision`
role (see core/agent.py). This module reports which model that would actually be
â€” and, crucially, whether it is **remote**: a remote vision model means the
screenshot leaves this device. The UI uses `remote` to warn the user before any
capture. Pure + unit-tested; the endpoint feeds it live key/probe state.
"""

from ..config import Config
from ..providers.router import parse_ref


def is_local_url(base_url: str) -> bool:
    """A provider served from this machine (its bytes never leave the device)."""
    return "localhost" in base_url or "127.0.0.1" in base_url


def resolve_vision(
    config: Config, key_present: dict[str, bool], local_up: bool
) -> dict:
    """Resolve the `vision` role the way the router would: walk its failover chain
    and return the first model that could actually run.

    A local provider (Ollama et al.) is usable when reachable (`local_up`); a
    remote one when its API key is present. `remote` is True when that model's
    provider is not local â€” i.e. a captured screen would be sent off-device.
    Returns ``available=False`` when nothing in the chain can run (or no `vision`
    role is configured).
    """
    for ref in config.roles.get("vision") or []:
        provider_name, model = parse_ref(ref)
        pc = config.providers.get(provider_name)
        if pc is None:
            continue
        local = is_local_url(pc.base_url)
        usable = local_up if local else key_present.get(provider_name, False)
        if usable:
            return {
                "available": True,
                "remote": not local,
                "model": model,
                "provider": provider_name,
            }
    return {"available": False, "remote": False, "model": None, "provider": None}
