import { describe, expect, it } from "vitest";
import {
  blinkLidTarget,
  breathScale,
  earFlickDelta,
  gazePitch,
  gazeYaw,
  glowIntensity,
  headNodY,
  legLift,
  nextBlinkInterval,
  orbitPos,
  shadowScale,
  tailWag,
  workRingDelta,
} from "./petAnim";

describe("breathScale", () => {
  it("rests at the low point at t=0 and peaks a quarter-cycle later", () => {
    expect(breathScale(0, "none", false)).toBeCloseTo(1.025);
    expect(breathScale(Math.PI / 2 / 1.8, "none", false)).toBeCloseTo(1.05);
    expect(breathScale(0, "nap", false)).toBeCloseTo(1.0125);
  });
});

describe("glowIntensity", () => {
  it("picks the ceiling by state, in priority order", () => {
    expect(glowIntensity(0, "nap", false, false)).toBe(0.6);
    expect(glowIntensity(0, "celebrate", false, false)).toBe(2.0);
    expect(glowIntensity(0, "none", true, false)).toBe(1.8);
    expect(glowIntensity(0, "none", false, true)).toBe(1.5);
    expect(glowIntensity(0, "none", false, false)).toBe(1.3);
  });
});

describe("headNodY", () => {
  it("is zero at t=0 / nap, and small otherwise", () => {
    expect(headNodY(0, false, "none")).toBe(0);
    expect(headNodY(0, false, "nap")).toBe(0);
    expect(headNodY(Math.PI / 2 / 1.8, false, "none")).toBeCloseTo(0.012);
  });
});

describe("gazeYaw", () => {
  it("is 0 straight ahead and clamps hard turns to ±0.55", () => {
    expect(gazeYaw(0, 1, 0)).toBe(0);
    expect(gazeYaw(1, 0, 0)).toBe(0.55);
    for (const [dx, dz, h] of [
      [1, 1, 0],
      [-1, -1, Math.PI],
      [0, -1, 0],
      [-3, 0.1, 2],
    ]) {
      expect(Math.abs(gazeYaw(dx, dz, h))).toBeLessThanOrEqual(0.55);
    }
  });
});

describe("gazePitch", () => {
  it("clamps to a natural range; nap droops; gaze biases up", () => {
    expect(gazePitch(0, 1, "none")).toBe(0);
    expect(gazePitch(5, 1, "none")).toBe(0.2);
    expect(gazePitch(-5, 1, "none")).toBe(-0.3);
    expect(gazePitch(0, 1, "nap")).toBe(0.6);
    expect(gazePitch(0, 1, "gaze")).toBeCloseTo(-0.15);
  });
});

describe("tailWag", () => {
  it("is still at t=0/nap and wags by gesture", () => {
    expect(tailWag(0, false, 0, "nap")).toBe(0);
    expect(tailWag(0, false, 0, "none")).toBe(0);
    expect(tailWag(Math.PI / 2 / 1.4, false, 0, "none")).toBeCloseTo(0.04);
    expect(tailWag(Math.PI / 2 / 12, false, 0, "celebrate")).toBeCloseTo(0.38);
  });
});

describe("legLift", () => {
  it("lifts diagonal pairs together while moving, micro-shifts at rest", () => {
    expect(legLift(0, 1, true, 0)).toBe(0);
    expect(legLift(Math.PI / 2 / 7, 1, true, 0)).toBeCloseTo(0.08);
    expect(legLift(Math.PI / 2 / 7, 1, true, 1)).toBe(0); // opposite phase → max(0,negative)
    expect(legLift(0, 0, false, 2)).toBeCloseTo(Math.sin(1.4) * 0.008);
  });
});

describe("blinkLidTarget", () => {
  it("closes only inside the 0.18s window at the end of the interval", () => {
    expect(blinkLidTarget(0, 4.2)).toBe(0);
    expect(blinkLidTarget(4.1, 4.2)).toBe(1);
    expect(blinkLidTarget(4.19, 4.2)).toBe(1);
    expect(blinkLidTarget(3.9, 4.2)).toBe(0);
  });
});

describe("nextBlinkInterval", () => {
  it("maps rand 0..1 to 3.8..6.4 s", () => {
    expect(nextBlinkInterval(() => 0)).toBe(3.8);
    expect(nextBlinkInterval(() => 1)).toBeCloseTo(6.4);
    expect(nextBlinkInterval(() => 0.5)).toBeCloseTo(5.1);
  });
});

describe("earFlickDelta", () => {
  it("twitches one ear over a short window, then settles", () => {
    expect(earFlickDelta(1, 1, "L")[0]).toBe(0);
    expect(earFlickDelta(1.075, 1, "L")[0]).toBeCloseTo(0.3);
    expect(earFlickDelta(1.16, 1, "L")[0]).toBe(0);
    expect(earFlickDelta(1.075, 1, "R")[1]).toBeCloseTo(-0.3);
    expect(earFlickDelta(1, 1, "none")).toEqual([0, 0]);
  });
});

describe("shadowScale", () => {
  it("is full on the ground, shrinks at the top of a hop", () => {
    expect(shadowScale(0)).toBe(1.0);
    expect(shadowScale(0.45)).toBeCloseTo(0.7);
    expect(shadowScale(0.9)).toBeCloseTo(0.7);
  });
});

describe("orbitPos", () => {
  it("places sparkles on a ring", () => {
    expect(orbitPos(0, 0, 6)[0]).toBeCloseTo(0.5);
    expect(orbitPos(0, 0, 6)[2]).toBeCloseTo(0);
    expect(orbitPos(0, 3, 6)[0]).toBeCloseTo(-0.5);
  });
});

describe("workRingDelta", () => {
  it("advances 1.2 rad/s", () => {
    expect(workRingDelta(0.016)).toBeCloseTo(0.0192);
  });
});
