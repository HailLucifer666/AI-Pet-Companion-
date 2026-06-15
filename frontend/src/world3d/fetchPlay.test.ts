import { describe, expect, it } from "vitest";
import { stepFetch, throwSpot, type FetchToy } from "./fetchPlay";
import { islandHeight, ISLAND_MAX_R } from "./terrain";

const toy = (phase: FetchToy["phase"]): FetchToy => ({ x: 10, z: 0, homeX: 0, homeZ: 0, phase });

describe("stepFetch â€” fetch phase machine", () => {
  it("idle â†’ heads nowhere", () => {
    expect(stepFetch(toy("idle"), 0, 0)).toEqual({ target: null, phase: "idle" });
  });

  it("outbound + far from the spark â†’ heads to the spark, stays outbound", () => {
    const s = stepFetch(toy("outbound"), 0, 0);
    expect(s.phase).toBe("outbound");
    expect(s.target).toEqual({ x: 10, z: 0 });
  });

  it("outbound + reached the spark â†’ flips to return, heads home", () => {
    const s = stepFetch(toy("outbound"), 10, 0.5);
    expect(s.phase).toBe("return");
    expect(s.target).toEqual({ x: 0, z: 0 });
  });

  it("return + still travelling â†’ keeps heading home", () => {
    const s = stepFetch(toy("return"), 5, 0);
    expect(s.phase).toBe("return");
    expect(s.target).toEqual({ x: 0, z: 0 });
  });

  it("return + got home â†’ done (idle, no target)", () => {
    expect(stepFetch(toy("return"), 0.3, 0)).toEqual({ target: null, phase: "idle" });
  });
});

describe("throwSpot", () => {
  it("lands on grass (above the waterline)", () => {
    for (let n = 0; n < 8; n++) {
      const p = throwSpot(0, 0, n);
      expect(islandHeight(p.x, p.z, ISLAND_MAX_R)).toBeGreaterThan(0.4);
    }
  });

  it("successive throws fan out (not the same spot)", () => {
    const a = throwSpot(0, 0, 0);
    const b = throwSpot(0, 0, 1);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1);
  });
});
