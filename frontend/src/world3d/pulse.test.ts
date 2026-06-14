import { describe, expect, it } from "vitest";
import { GATE_POINT, PULSE_DURATION, pulseDone, pulsePoint, pulseT } from "./pulse";

const O = { x: 0, y: 0, z: 0 };
const PET = { x: 4, y: 1, z: 0 };
const GATE = { x: 0, y: 3.2, z: -7 };

describe("pulseT", () => {
  it("runs 0 → 0.5 → 1 across the duration and clamps past the end", () => {
    expect(pulseT(0, 0)).toBe(0);
    expect(pulseT(0, PULSE_DURATION / 2)).toBeCloseTo(0.5);
    expect(pulseT(0, PULSE_DURATION)).toBe(1);
    expect(pulseT(0, PULSE_DURATION * 3)).toBe(1);
  });

  it("clamps a not-yet-born pulse to 0", () => {
    expect(pulseT(100, 0)).toBe(0);
  });
});

describe("pulseDone", () => {
  it("is true only at/after full progress", () => {
    expect(pulseDone(0.99)).toBe(false);
    expect(pulseDone(1)).toBe(true);
  });
});

describe("pulsePoint", () => {
  it("starts at origin, passes through the pet at the midpoint, ends at the gate", () => {
    const start = pulsePoint(0, O, PET, GATE);
    expect(start.x).toBeCloseTo(O.x);
    expect(start.y).toBeCloseTo(O.y); // no arc lift at the endpoints
    expect(start.z).toBeCloseTo(O.z);

    const mid = pulsePoint(0.5, O, PET, GATE);
    expect(mid.x).toBeCloseTo(PET.x);
    expect(mid.y).toBeCloseTo(PET.y);
    expect(mid.z).toBeCloseTo(PET.z);

    const end = pulsePoint(1, O, PET, GATE);
    expect(end.x).toBeCloseTo(GATE.x);
    expect(end.y).toBeCloseTo(GATE.y);
    expect(end.z).toBeCloseTo(GATE.z);
  });

  it("lifts above the straight line mid-leg (the arc)", () => {
    const quarter = pulsePoint(0.25, O, PET, GATE); // mid of leg 1
    expect(quarter.y).toBeGreaterThan(0.5); // arc lift present
  });

  it("defaults the gate to GATE_POINT", () => {
    const end = pulsePoint(1, O, PET);
    expect(end.z).toBeCloseTo(GATE_POINT.z);
  });
});
