import { describe, expect, it } from "vitest";
import { placeTarget, stepToward, WALK_SPEED } from "./locomotion";
import { ISLAND_MAX_R } from "./terrain";

describe("placeTarget", () => {
  it("resolves the fixed Places to distinct on-island spots", () => {
    const home = placeTarget("home");
    const bench = placeTarget("workbench");
    expect(home).not.toEqual(bench);
    for (const p of [home, bench, placeTarget("pool")]) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
      expect(Math.hypot(p.x, p.z)).toBeLessThan(ISLAND_MAX_R);
    }
  });

  it("wanders deterministically from the seed, varies across seeds, stays on land", () => {
    const a = placeTarget("wander", 42);
    expect(placeTarget("wander", 42)).toEqual(a); // same seed → same spot
    expect(placeTarget("wander", 43)).not.toEqual(a); // different seed → different spot
    expect(Math.hypot(a.x, a.z)).toBeLessThan(ISLAND_MAX_R - 4); // mid radius, not the rim
  });
});

describe("stepToward", () => {
  it("advances toward the target by speed * dt", () => {
    const s = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.5, 2, 0);
    expect(s.moving).toBe(true);
    expect(s.x).toBeCloseTo(1); // 2 u/s * 0.5 s
    expect(s.z).toBeCloseTo(0);
  });

  it("faces its travel direction (+Z heading = 0, +X heading = PI/2)", () => {
    expect(stepToward({ x: 0, z: 0 }, { x: 0, z: 5 }, 0.1, WALK_SPEED, 9).heading).toBeCloseTo(0);
    expect(stepToward({ x: 0, z: 0 }, { x: 5, z: 0 }, 0.1, WALK_SPEED, 9).heading).toBeCloseTo(Math.PI / 2);
  });

  it("snaps and stops on arrival, keeping the previous heading", () => {
    const s = stepToward({ x: 1.0, z: 1.0 }, { x: 1.02, z: 1.0 }, 1, WALK_SPEED, 1.234);
    expect(s.moving).toBe(false);
    expect(s.x).toBe(1.02);
    expect(s.heading).toBe(1.234); // idle pet doesn't spin
  });

  it("never overshoots: a big dt clamps to the target", () => {
    const s = stepToward({ x: 0, z: 0 }, { x: 1, z: 0 }, 100, WALK_SPEED, 0);
    expect(s.x).toBe(1);
    expect(s.z).toBe(0);
    expect(s.moving).toBe(true);
  });
});
