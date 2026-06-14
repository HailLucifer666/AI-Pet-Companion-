import { describe, expect, it } from "vitest";
import { arcApexY, threadArc, type Vec3 } from "./thread";

describe("threadArc", () => {
  it("puts the control point at the horizontal midpoint", () => {
    const mid = threadArc([2, 1, 4], [6, 1, 8]);
    expect(mid[0]).toBeCloseTo(4, 5);
    expect(mid[2]).toBeCloseTo(6, 5);
  });

  it("floors the lift for very short links", () => {
    const a: Vec3 = [0, 0.5, 0];
    const b: Vec3 = [0.5, 0.7, 0]; // horiz 0.5 → arch 0.25 < ARCH_MIN
    const mid = threadArc(a, b);
    expect(mid[1]).toBeCloseTo(0.7 + 1.2, 5); // max(y) + ARCH_MIN
  });

  it("caps the lift for long cross-island links", () => {
    const mid = threadArc([-15, 1, 0], [15, 1, 0]); // horiz 30 → 15, capped at 10
    expect(mid[1]).toBeCloseTo(1 + 10, 5);
  });

  it("lift grows with horizontal span (monotonic in the unclamped band)", () => {
    const short = threadArc([0, 0, 0], [4, 0, 0])[1]; // arch 2
    const long = threadArc([0, 0, 0], [8, 0, 0])[1]; // arch 4
    expect(long).toBeGreaterThan(short);
  });

  it("lifts above the taller endpoint", () => {
    const mid = threadArc([0, 0.6, 0], [6, 2.4, 0]);
    expect(mid[1]).toBeGreaterThan(2.4);
  });
});

describe("arcApexY", () => {
  it("clears the island's central peak for a long cross-island thread", () => {
    // two rim crystals (radius ~13) on opposite sides, low Y; the straight chord
    // would dip below the ~5.5 peak — the arc apex must rise above it.
    const apex = arcApexY([-13, 0.6, 0], [13, 0.6, 0]);
    expect(apex).toBeGreaterThan(5.5);
  });
});
