import { describe, expect, it } from "vitest";
import { computeDrawSpec } from "./drawSpec";

const STAGES = [1, 2, 3, 4] as const;

describe("computeDrawSpec", () => {
  it("always has a body and exactly two eyes", () => {
    for (const s of STAGES) {
      const spec = computeDrawSpec(s);
      expect(spec.shapes.some((sh) => sh.role === "body")).toBe(true);
      expect(spec.shapes.filter((sh) => sh.role === "eye")).toHaveLength(2);
    }
  });

  it("gains complexity and size with each stage", () => {
    const specs = STAGES.map(computeDrawSpec);
    for (let i = 1; i < specs.length; i++) {
      expect(specs[i].shapes.length).toBeGreaterThan(specs[i - 1].shapes.length);
      expect(specs[i].footprint).toBeGreaterThan(specs[i - 1].footprint);
    }
  });

  it("adds ears at Juvenile, a tail at Adult, sparks at Elder", () => {
    expect(computeDrawSpec(1).shapes.some((s) => s.role === "limb")).toBe(false);
    expect(computeDrawSpec(2).shapes.length).toBeGreaterThan(computeDrawSpec(1).shapes.length);
    expect(computeDrawSpec(3).shapes.some((s) => s.role === "limb")).toBe(true);
    expect(computeDrawSpec(4).shapes.some((s) => s.role === "spark")).toBe(true);
  });

  it("is pure and deterministic for a given stage", () => {
    expect(computeDrawSpec(3)).toEqual(computeDrawSpec(3));
  });
});
