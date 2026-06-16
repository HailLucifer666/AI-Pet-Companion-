import { describe, expect, it } from "vitest";
import { celestialPlacement, SKY_DIST } from "./celestial";

const len = (v: [number, number, number]) => Math.hypot(v[0], v[1], v[2]);

describe("celestialPlacement", () => {
  it("sun dominant at noon (dayness 1)", () => {
    const c = celestialPlacement([10, 27, 8], 1);
    expect(c.sunOpacity).toBe(1);
    expect(c.moonOpacity).toBe(0);
  });

  it("moon dominant in deep night (dayness 0)", () => {
    const c = celestialPlacement([-8, 11, -7], 0);
    expect(c.sunOpacity).toBe(0);
    expect(c.moonOpacity).toBe(1);
  });

  it("opacities always sum to 1 (a clean crossfade)", () => {
    for (const d of [0, 0.15, 0.3, 0.45, 0.7, 1]) {
      const c = celestialPlacement([10, 20, 5], d);
      expect(c.sunOpacity + c.moonOpacity).toBeCloseTo(1, 6);
    }
  });

  it("twilight (dayness 0.3) blends both", () => {
    const c = celestialPlacement([16, 7, 6], 0.3);
    expect(c.sunOpacity).toBeGreaterThan(0);
    expect(c.sunOpacity).toBeLessThan(1);
  });

  it("offset length is the sky distance regardless of sunDir magnitude", () => {
    expect(len(celestialPlacement([1, 1, 1], 1).offset)).toBeCloseTo(SKY_DIST, 4);
    expect(len(celestialPlacement([80, 270, 80], 1).offset)).toBeCloseTo(SKY_DIST, 4);
  });

  it("elevation is capped low so the body rides near the horizon", () => {
    // Noon sunDir [10,27,8] is steeply overhead (~64°) — must be pulled down.
    const { offset } = celestialPlacement([10, 27, 8], 1);
    const elev = Math.atan2(offset[1], Math.hypot(offset[0], offset[2]));
    expect(elev).toBeLessThanOrEqual(0.51); // ~MAX_ELEV
    expect(offset[1]).toBeGreaterThan(0); // still above the horizon, not below
  });

  it("preserves the compass azimuth while capping elevation", () => {
    const { offset } = celestialPlacement([10, 27, 8], 1);
    // azimuth in the x/z plane is unchanged by the elevation clamp
    expect(Math.atan2(offset[2], offset[0])).toBeCloseTo(Math.atan2(8, 10), 5);
  });
});
