import { describe, expect, it } from "vitest";
import { PLACES_3D } from "./placeDefs";

describe("PLACES_3D", () => {
  it("has the three Grove places with routes", () => {
    expect(PLACES_3D.map((p) => p.id).sort()).toEqual(["garden", "hollow", "workbench"]);
    for (const p of PLACES_3D) expect(p.route.startsWith("/")).toBe(true);
  });

  it("sits each place on the island (finite coords, within radius, on land)", () => {
    for (const p of PLACES_3D) {
      const [x, y, z] = p.pos;
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
      expect(Math.hypot(x, z)).toBeLessThan(10);
      expect(y).toBeGreaterThan(0);
    }
  });
});
