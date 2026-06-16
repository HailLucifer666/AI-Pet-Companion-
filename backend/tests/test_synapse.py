"""Synapse pub/sub mechanics and the SSE stream generator."""

import asyncio
import json

from neuraclaw.core.synapse import Synapse, sse_stream


async def test_publish_fans_out_to_all_subscribers():
    bus = Synapse()
    a, b = bus.subscribe(), bus.subscribe()
    bus.publish("agent.thinking", session_id="s1")
    ev_a, ev_b = a.get_nowait(), b.get_nowait()
    assert ev_a is not None and ev_a.type == "agent.thinking"
    assert ev_a.payload == {"session_id": "s1"}
    assert ev_b is not None and ev_b.type == "agent.thinking"


async def test_slow_subscriber_drops_oldest_without_blocking():
    bus = Synapse(queue_capacity=2)
    q = bus.subscribe()
    for i in range(5):  # would deadlock here if publish ever blocked
        bus.publish("tick", n=i)
    received = [q.get_nowait().payload["n"] for _ in range(2)]
    assert received == [3, 4]  # oldest dropped, newest kept
    assert q.empty()


async def test_unsubscribed_queue_receives_no_further_events():
    bus = Synapse()
    q = bus.subscribe()
    bus.unsubscribe(q)
    assert q.get_nowait() is None  # wake-up sentinel
    bus.publish("agent.done")
    assert q.empty()


async def test_sse_stream_exits_cleanly_on_unsubscribe():
    bus = Synapse()
    chunks: list[str] = []

    async def consume():
        async for chunk in sse_stream(bus, heartbeat_s=60.0):
            chunks.append(chunk)

    task = asyncio.create_task(consume())
    await asyncio.sleep(0)  # let the stream subscribe
    bus.unsubscribe(bus._subscribers[0])
    await asyncio.wait_for(task, timeout=1.0)
    assert chunks == []
    assert bus._subscribers == []


async def test_sse_stream_yields_published_event_as_data_line():
    bus = Synapse()
    gen = sse_stream(bus, heartbeat_s=60.0)
    first = asyncio.ensure_future(anext(gen))
    await asyncio.sleep(0)  # let the generator subscribe
    bus.publish("memory.formed", memory_id=7, memory_type="fact")
    chunk = await asyncio.wait_for(first, timeout=1.0)
    assert chunk.startswith("data: ") and chunk.endswith("\n\n")
    parsed = json.loads(chunk[len("data: "):])
    assert parsed == {"type": "memory.formed", "memory_id": 7, "memory_type": "fact"}
    await gen.aclose()
    assert bus._subscribers == []


async def test_sse_stream_heartbeat_on_silence():
    bus = Synapse()
    gen = sse_stream(bus, heartbeat_s=0.01)
    chunk = await asyncio.wait_for(anext(gen), timeout=1.0)
    assert chunk == ": hb\n\n"
    await gen.aclose()
