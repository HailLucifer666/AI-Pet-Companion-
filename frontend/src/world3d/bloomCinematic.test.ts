import { describe, expect, it } from "vitest";
import { clamp01, bloomFlash, bloomGateScale } from "./bloomCinematic";

describe("bloomFlash — cubic-out level-up flash", () => {
  it("peaks at the moment of the bloom", () => {
    expect(bloomFlash(0, 1400)).toBe(1);
  });

  it("fully decays at the duration", () => {
    expect(bloomFlash(1400, 1400)).toBe(0);
  });

  it("is cubic-out (non-linear) — well below 0.5 by the midpoint", () => {
    const f = bloomFlash(700, 1400); // linear decay would be 0.5
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(0.2);
  });

  it("clamps a negative since (clock skew) to peak — never a spurious dark gate", () => {
    expect(bloomFlash(-50, 1400)).toBe(1);
  });

  it("clamps far past the duration to zero", () => {
    expect(bloomFlash(9999, 1400)).toBe(0);
  });
});

describe("bloomGateScale", () => {
  it("rest (no flash) → no swell", () => {
    expect(bloomGateScale(0)).toBe(1);
  });

  it("full bloom → 12% swell", () => {
    expect(bloomGateScale(1)).toBeCloseTo(1.12);
  });
});

describe("clamp01", () => {
  it("clamps below/above/within", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});
