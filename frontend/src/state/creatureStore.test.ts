import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reduceCreature, useCreatureStore, type CreatureStoreState } from "./creatureStore";

describe("reduceCreature", () => {
  const base: CreatureStoreState = {
    stage: 1,
    xp: 0,
    state: "idle",
    reaction: null,
    lastEventAt: 0,
  };

  it("initial state maps to what we expect", () => {
    expect(base.state).toBe("idle");
  });

  it("agent.thinking goes to thinking", () => {
    const res = reduceCreature(base, { type: "agent.thinking" });
    expect(res.state).toBe("thinking");
  });

  it("agent.tool.start beats thinking", () => {
    const res = reduceCreature({ ...base, state: "thinking" }, { type: "agent.tool.start" });
    expect(res.state).toBe("working");
  });

  it("agent.done resets to idle", () => {
    const res = reduceCreature({ ...base, state: "working" }, { type: "agent.done" });
    expect(res.state).toBe("idle");
  });

  it("memory.formed -> learning + ear-flick", () => {
    const res = reduceCreature(base, { type: "memory.formed" });
    expect(res.state).toBe("learning");
    expect(res.reaction).toEqual({ kind: "ear-flick", seq: 1 });
  });

  it("seq increments on repeat", () => {
    const res1 = reduceCreature(base, { type: "memory.formed" });
    const res2 = reduceCreature({ ...base, ...res1 } as CreatureStoreState, { type: "memory.formed" });
    expect(res2.reaction).toEqual({ kind: "ear-flick", seq: 2 });
  });
});

describe("creatureStore timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCreatureStore.setState({ state: "idle", lastEventAt: Date.now() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("celebrating decays to idle", () => {
    useCreatureStore.getState().dispatch({ type: "skill.drafted" });
    expect(useCreatureStore.getState().state).toBe("celebrating");
    
    vi.advanceTimersByTime(6000);
    expect(useCreatureStore.getState().state).toBe("idle");
  });

  it("sleep after 30 min idle", () => {
    useCreatureStore.getState().dispatch({ type: "agent.done" }); // goes idle
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(useCreatureStore.getState().state).toBe("sleeping");
  });
});
