import { describe, expect, it } from "vitest";
import { stageReveal } from "./widening";

describe("stageReveal â€” the world opens as the pet matures", () => {
  it("a young companion lives in a closer, mistier world than an elder", () => {
    const s1 = stageReveal(1);
    const s4 = stageReveal(4);
    expect(s4.surveyDist).toBeGreaterThan(s1.surveyDist);
    expect(s4.fogFar).toBeGreaterThan(s1.fogFar);
  });

  it("never contracts â€” survey + fog are monotonic non-decreasing across stages", () => {
    for (let s = 2; s <= 4; s++) {
      expect(stageReveal(s).surveyDist).toBeGreaterThanOrEqual(stageReveal(s - 1).surveyDist);
      expect(stageReveal(s).fogFar).toBeGreaterThanOrEqual(stageReveal(s - 1).fogFar);
    }
  });

  it("clamps out-of-range / junk stages to 1..4", () => {
    expect(stageReveal(0)).toEqual(stageReveal(1));
    expect(stageReveal(-5)).toEqual(stageReveal(1));
    expect(stageReveal(9)).toEqual(stageReveal(4));
    expect(stageReveal(NaN)).toEqual(stageReveal(1));
  });

  it("rounds fractional stages", () => {
    expect(stageReveal(2.4)).toEqual(stageReveal(2));
    expect(stageReveal(2.6)).toEqual(stageReveal(3));
  });
});
