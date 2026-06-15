import { describe, expect, it } from "vitest";
import { arrive, placeTarget, WALK_SPEED } from "./locomotion";
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
    expect(placeTarget("wander", 42)).toEqual(a); // same seed â†’ same spot
    expect(placeTarget("wander", 43)).not.toEqual(a); // different seed â†’ different spot
    expect(Math.hypot(a.x, a.z)).toBeLessThan(ISLAND_MAX_R); // local roaming region, never past the rim
  });
});

describe("arrive", () => {
  it("heads toward the target at full speed when far", () => {
    const v = arrive({ x: 0, z: 0 }, { x: 10, z: 0 }, 2);
    expect(Math.hypot(v.vx, v.vz)).toBeCloseTo(2); // full speed
    expect(v.vx).toBeCloseTo(2); // pointing +x
    expect(v.vz).toBeCloseTo(0);
    expect(v.dist).toBeCloseTo(10);
  });

  it("eases down as it nears the target (arrival), not a hard stop", () => {
    const far = arrive({ x: 0, z: 0 }, { x: 10, z: 0 }, 2);
    const near = arrive({ x: 9.2, z: 0 }, { x: 10, z: 0 }, 2); // 0.8 away, inside decel
    const farSpeed = Math.hypot(far.vx, far.vz);
    const nearSpeed = Math.hypot(near.vx, near.vz);
    expect(nearSpeed).toBeLessThan(farSpeed);
    expect(nearSpeed).toBeGreaterThan(0);
  });

  it("is at rest on arrival", () => {
    const v = arrive({ x: 5, z: 5 }, { x: 5, z: 5 }, WALK_SPEED);
    expect(v.vx).toBe(0);
    expect(v.vz).toBe(0);
  });

  it("velocity direction matches the bearing to the target", () => {
    const v = arrive({ x: 0, z: 0 }, { x: 0, z: 5 }, WALK_SPEED); // +z
    expect(Math.atan2(v.vx, v.vz)).toBeCloseTo(0);
    const v2 = arrive({ x: 0, z: 0 }, { x: 5, z: 0 }, WALK_SPEED); // +x
    expect(Math.atan2(v2.vx, v2.vz)).toBeCloseTo(Math.PI / 2);
  });
});
