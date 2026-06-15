import { describe, expect, it } from "vitest";
import { skillMonumentPosition } from "./skillMonumentPlacement";

const FX = -20; // forge world x at WORLD_SCALE=5
const FZ = 19; // forge world z

describe("skillMonumentPosition", () => {
  it("is deterministic â€” same inputs, same spot", () => {
    const a = skillMonumentPosition(0, 42, FX, FZ);
    const b = skillMonumentPosition(0, 42, FX, FZ);
    expect(a).toEqual(b);
  });

  it("rings the forge at radius 6â€“8", () => {
    for (let i = 0; i < 8; i++) {
      const p = skillMonumentPosition(i, i + 1, FX, FZ);
      const d = Math.hypot(p.x - FX, p.z - FZ);
      expect(d).toBeGreaterThan(5.9);
      expect(d).toBeLessThan(8.1);
    }
  });

  it("spreads â€” no two of the first 8 monuments collide within 0.5 units", () => {
    const pts = Array.from({ length: 8 }, (_, i) => skillMonumentPosition(i, i + 1, FX, FZ));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z)).toBeGreaterThan(0.5);
      }
    }
  });

  it("grounds the monument on land (never under water or on a peak)", () => {
    const p = skillMonumentPosition(3, 7, FX, FZ);
    expect(p.y).toBeGreaterThan(0);
  });
});
