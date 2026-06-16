"""The agent loop: context -> model -> tools -> repeat until final text."""

import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import aiosqlite

from ..config import WORKSPACE_DIR, Config
from ..providers import ProviderError, Router, ToolsUnsupportedError, parse_ref
from ..tools import Registry, ToolContext
from ..tools.registry import args_summary
from . import context, tooltags
from .synapse import Synapse

log = logging.getLogger(__name__)


@dataclass
class AgentEvent:
    type: str  # delta | tool_start | tool_end | done | error
    text: str = ""
    tool: str = ""
    detail: str = ""
    ok: bool = True


async def _persist(
    db: aiosqlite.Connection, session_id: str, msg: dict[str, Any]
) -> None:
    await db.execute(
        "INSERT INTO messages (session_id, role, content, tool_calls_json, tool_call_id)"
        " VALUES (?, ?, ?, ?, ?)",
        (
            session_id,
            msg["role"],
            msg.get("content") or "",
            json.dumps(msg["tool_calls"]) if msg.get("tool_calls") else None,
            msg.get("tool_call_id"),
        ),
    )
    await db.commit()


async def run_turn(
    *,
    db: aiosqlite.Connection,
    router: Router,
    registry: Registry,
    config: Config,
    session_id: str,
    user_text: str,
    role: str = "primary",
    image_b64: str | None = None,
    model: str | None = None,
    synapse: Synapse | None = None,
) -> AsyncIterator[AgentEvent]:
    """Run one agent turn. The user message must already be persisted.

    `role` selects a failover chain (the resilient default). When `model` is a
    concrete "provider/model" ref it overrides the role entirely — that single
    model is used with NO failover (it is still subject to `no_tools_models`).

    When `synapse` is provided, the turn's lifecycle is mirrored onto the bus
    so the whole UI (the creature, any surface) reacts to real activity.

    When `image_b64` is given, the latest user message becomes a multimodal
    (text + image) content array so a vision model can see the attached screen.
    The image is sent to the model but never persisted to history.
    """
    # Resolve the model override once; None means use role routing.
    explicit = parse_ref(model) if model else None
    system = await context.build_system_prompt(db, user_text)
    history = await context.load_history(db, session_id, config.agent)
    messages: list[dict[str, Any]] = [{"role": "system", "content": system}, *history]

    if image_b64:
        # Attach the image to the current turn (the last user message in history).
        for msg in reversed(messages):
            if msg.get("role") == "user":
                msg["content"] = context.build_user_content(user_text, image_b64)
                break

    ctx = ToolContext(
        db=db,
        config=config,
        router=router,
        session_id=session_id,
        workspace=WORKSPACE_DIR / session_id,
    )
    tools = registry.schemas()

    if synapse:
        synapse.publish("agent.thinking", session_id=session_id)

    for _step in range(config.agent.max_steps):
        response = None
        stream = (
            router.chat_stream_explicit(explicit[0], explicit[1], messages, tools=tools)
            if explicit
            else router.chat_stream(role, messages, tools=tools)
        )
        try:
            async for delta in stream:
                if delta.text:
                    yield AgentEvent(type="delta", text=delta.text)
                if delta.done:
                    response = delta.response
        except ToolsUnsupportedError:
            # Selected model/chain has no tool support: degrade to plain chat, once.
            log.warning("%r lacks tool support; retrying without tools", model or role)
            tools = None
            continue
        except ProviderError as e:
            if synapse:
                synapse.publish("agent.done", session_id=session_id)
            yield AgentEvent(type="error", text=str(e), ok=False)
            return

        if response is None:
            if synapse:
                synapse.publish("agent.done", session_id=session_id)
            yield AgentEvent(type="error", text="Provider returned no response", ok=False)
            return

        # The calls to run this step: structured tool_calls first; otherwise fall
        # back to [[tool {json}]] tags in the text (for models that can't emit
        # structured calls). Tags are read ONLY when there are no structured calls,
        # so capable models never double-fire.
        if response.tool_calls:
            calls = [(tc.id, tc.name, tc.arguments_json) for tc in response.tool_calls]
            assistant_content = response.text or None
        else:
            tagged = (
                tooltags.parse_tool_tags(response.text)
                if config.agent.tool_tag_fallback
                else []
            )
            tagged = [(name, args) for name, args in tagged if name in registry.tools]
            if not tagged:
                await _persist(
                    db, session_id, {"role": "assistant", "content": response.text}
                )
                if synapse:
                    synapse.publish("agent.done", session_id=session_id)
                yield AgentEvent(type="done", text=response.text)
                return
            calls = [(f"tag_{i}", name, args) for i, (name, args) in enumerate(tagged)]
            assistant_content = tooltags.strip_tags(response.text) or None

        assistant_msg = {
            "role": "assistant",
            "content": assistant_content,
            "tool_calls": [
                {"id": cid, "type": "function", "function": {"name": name, "arguments": args}}
                for cid, name, args in calls
            ],
        }
        messages.append(assistant_msg)
        await _persist(db, session_id, assistant_msg)

        for cid, name, args in calls:
            if synapse:
                synapse.publish("agent.tool.start", tool=name)
            yield AgentEvent(type="tool_start", tool=name, detail=args_summary(args))
            result = await registry.dispatch(ctx, name, args)
            if synapse:
                synapse.publish("agent.tool.end", tool=name, ok=result.ok)
            yield AgentEvent(
                type="tool_end", tool=name, detail=result.content[:300], ok=result.ok
            )
            tool_msg = {"role": "tool", "content": result.content, "tool_call_id": cid}
            messages.append(tool_msg)
            await _persist(db, session_id, tool_msg)

    if synapse:
        synapse.publish("agent.done", session_id=session_id)
    yield AgentEvent(
        type="error",
        text=f"Stopped after {config.agent.max_steps} steps without a final answer.",
        ok=False,
    )
