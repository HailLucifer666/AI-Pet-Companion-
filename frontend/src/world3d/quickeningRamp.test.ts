import { describe, expect, it } from "vitest";
import { rampHour, DAWN_MS } from "./quickeningRamp";

describe("rampHour â€” the Quickening darkâ†’dawn schedule", () => {
  it("idle is deep night", () => {
    expect(rampHour("idle", 0, 0)).toBe(1.0);
  });

  it("questions warm the sky per answered question, but stay below pre-dawn", () => {
    expect(rampHour("questions", 0, 0)).toBe(1.0);
    expect(rampHour("questions", 2, 0)).toBeCloseTo(2.6, 5);
    // capped below pre-dawn (5.0) so dawn is reserved for the hatch
    expect(rampHour("questions", 9, 0)).toBeLessThan(5.0);
  });

  it("hatching holds at pre-dawn regardless of time", () => {
    expect(rampHour("hatching", 4, 0)).toBe(5.0);
    expect(rampHour("hatching", 4, 99999)).toBe(5.0);
  });

  it("dawn eases from pre-dawn (5.0) to first dawn (6.5)", () => {
    expect(rampHour("dawn", 4, 0)).toBe(5.0);
    expect(rampHour("dawn", 4, DAWN_MS)).toBeCloseTo(6.5, 5);
  });

  it("dawn is cubic-out, not linear (light floods in fast, then settles)", () => {
    const mid = rampHour("dawn", 4, DAWN_MS / 2); // linear would be 5.75
    expect(mid).toBeGreaterThan(5.75); // cubic-out: already most of the way by half-time
    expect(mid).toBeLessThan(6.5);
  });

  it("dawn clamps past its duration to 6.5", () => {
    expect(rampHour("dawn", 4, DAWN_MS * 5)).toBeCloseTo(6.5, 5);
  });

  it("every phase returns a valid daylight hour in [1.0, 6.5]", () => {
    for (const p of ["idle", "questions", "hatching", "dawn"] as const) {
      for (const t of [0, 500, DAWN_MS, 99999]) {
        for (const qi of [0, 2, 4]) {
          const h = rampHour(p, qi, t);
          expect(h).toBeGreaterThanOrEqual(1.0);
          expect(h).toBeLessThanOrEqual(6.5);
        }
      }
    }
  });
});
