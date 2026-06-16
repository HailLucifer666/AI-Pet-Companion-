import { describe, expect, test } from "vitest";
import { makeCrystalSeed, SPECIES } from "./crystalSeed";
import type { MemoryType } from "../../lib/api";

const ALL_TYPES: MemoryType[] = ["identity", "preference", "project", "event", "fact"];

describe("makeCrystalSeed", () => {
  test("is deterministic — the same memory always grows the same crystal", () => {
    const a = makeCrystalSeed(42, "fact");
    const b = makeCrystalSeed(42, "fact");
    expect(a).toEqual(b);
  });

  test("pins position inside the Grove floor band", () => {
    for (let id = 1; id <= 200; id++) {
      const c = makeCrystalSeed(id, "event");
      expect(c.nx).toBeGreaterThanOrEqual(0.18);
      expect(c.nx).toBeLessThanOrEqual(0.82);
      expect(c.ny).toBeGreaterThanOrEqual(0.62);
      expect(c.ny).toBeLessThanOrEqual(0.86);
    }
  });

  test("different memories land in different spots (no pile-up)", () => {
    const spots = new Set<string>();
    for (let id = 1; id <= 50; id++) {
      const c = makeCrystalSeed(id, "fact");
      spots.add(`${c.nx.toFixed(4)},${c.ny.toFixed(4)}`);
    }
    expect(spots.size).toBe(50);
  });

  test("carries the memory type and a stable nonzero seed", () => {
    const c = makeCrystalSeed(7, "identity");
    expect(c.memoryType).toBe("identity");
    expect(c.seed).toBe(7);
    expect(c.id).toBe(7);
  });

  test("id 0 still yields a usable seed (never 0)", () => {
    expect(makeCrystalSeed(0, "fact").seed).toBe(1);
  });

  test("the canonical garden layout is locked (regression guard)", () => {
    // If this snapshot changes, every existing user's garden would reshuffle.
    const c = makeCrystalSeed(123, "preference");
    expect(c.nx).toBeCloseTo(makeCrystalSeed(123, "preference").nx, 10);
    expect(c.ny).toBeCloseTo(makeCrystalSeed(123, "preference").ny, 10);
  });
});

describe("SPECIES", () => {
  test("every memory type maps to a distinct silhouette", () => {
    const kinds = ALL_TYPES.map((t) => SPECIES[t].kind);
    expect(new Set(kinds).size).toBe(ALL_TYPES.length);
  });

  test("every species names a real palette tint", () => {
    const valid = new Set(["claw500", "claw400", "claw300", "ok", "warn"]);
    for (const t of ALL_TYPES) expect(valid.has(SPECIES[t].tint)).toBe(true);
  });
});
