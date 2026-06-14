import { describe, expect, it } from "vitest";
import { daylightAt, glowBoost, localHour } from "./daylight";

describe("daylightAt", () => {
  it("is bright, lit, and not night at noon", () => {
    const d = daylightAt(12.5);
    expect(d.isNight).toBe(false);
    expect(d.dayness).toBeCloseTo(1);
    expect(d.sunIntensity).toBeGreaterThan(1.5);
    expect(d.sunDir[1]).toBeGreaterThan(20); // sun high overhead
  });

  it("is dark and flagged night in the small hours", () => {
    const d = daylightAt(2);
    expect(d.isNight).toBe(true);
    expect(d.dayness).toBeLessThan(0.15);
    expect(d.sunIntensity).toBeLessThan(0.5);
  });

  it("wraps continuously across midnight (00:00 ≈ 24:00)", () => {
    const a = daylightAt(0);
    const b = daylightAt(24);
    expect(a.sky).toBe(b.sky);
    expect(a.sunIntensity).toBeCloseTo(b.sunIntensity);
  });

  it("returns finite, in-range values at every hour", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const d = daylightAt(h);
      expect(Number.isFinite(d.sunIntensity)).toBe(true);
      expect(d.sky).toBeGreaterThanOrEqual(0);
      expect(d.sky).toBeLessThanOrEqual(0xffffff);
      expect(d.dayness).toBeGreaterThanOrEqual(0);
      expect(d.dayness).toBeLessThanOrEqual(1);
    }
  });

  it("localHour reads hours + minutes as a fraction", () => {
    expect(localHour(new Date(2026, 0, 1, 9, 30))).toBeCloseTo(9.5);
    expect(localHour(new Date(2026, 0, 1, 0, 0))).toBe(0);
  });
});

describe("glowBoost — full-glow night", () => {
  it("is ~1x at noon and brightest at deep night", () => {
    expect(glowBoost(1)).toBeCloseTo(1);
    expect(glowBoost(0)).toBeCloseTo(2.7);
    expect(glowBoost(0)).toBeGreaterThan(glowBoost(0.5));
    expect(glowBoost(0.5)).toBeGreaterThan(glowBoost(1));
  });

  it("clamps out-of-range dayness", () => {
    expect(glowBoost(2)).toBeCloseTo(1);
    expect(glowBoost(-1)).toBeCloseTo(2.7);
  });
});
