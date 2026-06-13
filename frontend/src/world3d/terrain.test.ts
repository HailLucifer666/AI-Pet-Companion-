import { describe, expect, it } from "vitest";
import { fbm, islandHeight } from "./terrain";

const MAX_R = 10;

describe("islandHeight", () => {
  it("is deterministic (same world every launch)", () => {
    expect(islandHeight(2, -3, MAX_R)).toBe(islandHeight(2, -3, MAX_R));
  });

  it("rises in the middle and sinks under water at the rim", () => {
    const center = islandHeight(0, 0, MAX_R);
    const rim = islandHeight(MAX_R, 0, MAX_R);
    expect(center).toBeGreaterThan(1); // land
    expect(rim).toBeLessThan(0); // water
  });

  it("stays finite across the field", () => {
    for (let x = -MAX_R; x <= MAX_R; x += 2) {
      for (let z = -MAX_R; z <= MAX_R; z += 2) {
        expect(Number.isFinite(islandHeight(x, z, MAX_R))).toBe(true);
      }
    }
  });
});

describe("fbm", () => {
  it("is bounded to ~[0,1] and deterministic", () => {
    for (let i = 0; i < 50; i++) {
      const v = fbm(i * 0.7, i * 1.3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(fbm(3.2, 4.1)).toBe(fbm(3.2, 4.1));
  });
});
