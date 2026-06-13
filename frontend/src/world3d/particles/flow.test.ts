import { describe, it, expect } from "vitest";
import { makeField, motePosition, type Mote } from "./flow";

const sample = (m: Mote, t: number) => {
  const out = { x: 0, y: 0, z: 0 };
  motePosition(m, t, out);
  return out;
};

describe("makeField", () => {
  it("is deterministic for a given seed", () => {
    const a = makeField(50, 0xbeef);
    const b = makeField(50, 0xbeef);
    expect(a.motes).toEqual(b.motes);
  });

  it("differs across seeds", () => {
    const a = makeField(50, 1);
    const b = makeField(50, 2);
    expect(a.motes[0]).not.toEqual(b.motes[0]);
  });

  it("produces the requested count", () => {
    expect(makeField(120, 7).motes).toHaveLength(120);
  });

  it("keeps motes within the radius and vertical band", () => {
    const { motes } = makeField(400, 42, 13, 0.6, 6);
    for (const m of motes) {
      expect(Math.hypot(m.bx, m.bz)).toBeLessThanOrEqual(13 + 1e-9);
      expect(m.by).toBeGreaterThanOrEqual(0.6);
      expect(m.by).toBeLessThanOrEqual(6);
    }
  });
});

describe("motePosition", () => {
  it("stays within amp/bob of the base for all t", () => {
    const { motes } = makeField(200, 99);
    for (const m of motes) {
      for (const t of [0, 1.3, 7.7, 50, 123.4]) {
        const p = sample(m, t);
        // two offset sines per axis → bounded by amp*(1+0.4)
        expect(Math.abs(p.x - m.bx)).toBeLessThanOrEqual(m.amp * 1.4 + 1e-9);
        expect(Math.abs(p.z - m.bz)).toBeLessThanOrEqual(m.amp * 1.4 + 1e-9);
        expect(Math.abs(p.y - m.by)).toBeLessThanOrEqual(m.bob + 1e-9);
      }
    }
  });

  it("is deterministic in time (pure)", () => {
    const m = makeField(1, 5).motes[0];
    expect(sample(m, 3.21)).toEqual(sample(m, 3.21));
  });

  it("actually moves over time", () => {
    const m = makeField(1, 5).motes[0];
    expect(sample(m, 0)).not.toEqual(sample(m, 2));
  });
});
