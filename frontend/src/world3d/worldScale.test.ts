import { describe, expect, it } from "vitest";
import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";
import { ALL_PLACES } from "./placeRegistry";
import { placeTarget } from "./locomotion";

/** After growing the world ×WORLD_SCALE, the place markers + the pet anchors sit at
 *  scaled positions sampled against the noise terrain — so they MUST be re-verified
 *  to land on grass (above the waterline, off any peak). If one drifts underwater or
 *  onto rock here, nudge its coords in placeDefs.ts / locomotion.ts until it passes. */
describe("world scale", () => {
  it("grew the island by WORLD_SCALE", () => {
    expect(WORLD_SCALE).toBeGreaterThan(1);
    expect(ISLAND_MAX_R).toBe(16 * WORLD_SCALE);
  });

  it("every place marker lands on grassy land within the island", () => {
    for (const p of ALL_PLACES) {
      const [x, y, z] = p.pos;
      expect(Math.hypot(x, z)).toBeLessThan(ISLAND_MAX_R);
      expect(y).toBeGreaterThan(0.3); // above the waterline
      expect(y).toBeLessThan(5); // not a rocky peak
    }
  });

  it("every pet anchor lands on grassy land within the island", () => {
    for (const place of ["hollow", "workbench", "pool"] as const) {
      const a = placeTarget(place);
      const y = islandHeight(a.x, a.z, ISLAND_MAX_R);
      expect(Math.hypot(a.x, a.z)).toBeLessThan(ISLAND_MAX_R);
      expect(y).toBeGreaterThan(0.3);
      expect(y).toBeLessThan(5);
    }
  });
});
