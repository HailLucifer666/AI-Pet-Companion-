"""Synapse: in-process async pub/sub event bus.

The agent's real activity (thinking, tool runs, memory formed, skill
drafted) is published here and fans out to every subscriber â€” primarily
the GET /api/events SSE channel the whole UI listens on. A module-level
singleton wires publishers in memory/skillsys (which have no app/request
access) to the API layer without coupling them to FastAPI.

Payload rule: payload keys must never be named "type" â€” it would shadow
the event type in the serialized JSON. (Memory type travels as
"memory_type".)
"""

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

log = logging.getLogger(__name__)

DEFAULT_QUEUE_CAPACITY = 64
HEARTBEAT_SECONDS = 25.0


@dataclass
class SynapseEvent:
    type: str
    payload: dict = field(default_factory=dict)


class Synapse:
    """Fan-out pub/sub. Publishing never blocks: a slow subscriber's
    queue drops its oldest event instead of backpressuring the agent."""

    def __init__(self, queue_capacity: int = DEFAULT_QUEUE_CAPACITY) -> None:
        self._queue_capacity = queue_capacity
        self._subscribers: list[asyncio.Queue[SynapseEvent | None]] = []

    def subscribe(self) -> asyncio.Queue[SynapseEvent | None]:
        q: asyncio.Queue[SynapseEvent | None] = asyncio.Queue(
            maxsize=self._queue_capacity
        )
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[SynapseEvent | None]) -> None:
        try:
            self._subscribers.remove(q)
        except ValueError:
            return
        # Sentinel wakes a consumer blocked on get() so it can exit.
        try:
            q.put_nowait(None)
        except asyncio.QueueFull:
            pass

    def publish(self, type: str, **payload: object) -> None:
        """Fire-and-forget. No subscribers -> no-op (cheap in tests)."""
        if not self._subscribers:
            return
        event = SynapseEvent(type=type, payload=payload)
        for q in self._subscribers:
            if q.full():
                try:
                    q.get_nowait()  # drop oldest, keep the stream live
                except asyncio.QueueEmpty:
                    pass
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:  # pragma: no cover - capacity >= 1
                log.warning("synapse: subscriber queue still full after drop")


async def sse_stream(
    bus: Synapse, *, heartbeat_s: float = HEARTBEAT_SECONDS
) -> AsyncIterator[str]:
    """SSE-formatted event feed for GET /api/events. Live-only, no replay.

    Yields a comment heartbeat every heartbeat_s of silence so proxies
    and the browser keep the connection open. Parameterised so tests can
    run it with a tiny heartbeat and no HTTP client.
    """
    q = bus.subscribe()
    try:
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=heartbeat_s)
            except TimeoutError:
                yield ": hb\n\n"
                continue
            if event is None:  # unsubscribe sentinel
                return
            data = json.dumps(
                {"type": event.type, **event.payload}, ensure_ascii=False
            )
            yield f"data: {data}\n\n"
    finally:
        bus.unsubscribe(q)


# Module-level singleton: publishers (agent loop via routes, memory store,
# skill reflector) and the SSE endpoint all share this instance.
synapse = Synapse()
