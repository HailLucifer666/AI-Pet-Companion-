import { describe, expect, it } from "vitest";
import type { MemoryType } from "../lib/api";
import { CRYSTAL_COLOR, crystalPosition } from "./crystalPlacement";

describe("crystalPosition", () => {
  it("is deterministic — same memory, same spot every launch", () => {
    expect(crystalPosition(42)).toEqual(crystalPosition(42));
  });

  it("differs across seeds", () => {
    expect(crystalPosition(1)).not.toEqual(crystalPosition(2));
  });

  it("lands on the island (finite, within radius)", () => {
    for (let s = 1; s < 60; s++) {
      const p = crystalPosition(s, 10);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(10);
    }
  });
});

describe("CRYSTAL_COLOR", () => {
  it("covers all five memory species", () => {
    const types: MemoryType[] = ["identity", "preference", "project", "event", "fact"];
    for (const t of types) expect(typeof CRYSTAL_COLOR[t]).toBe("number");
  });
});
