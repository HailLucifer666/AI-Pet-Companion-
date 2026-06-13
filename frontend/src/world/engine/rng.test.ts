import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, pick, range } from "./rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed (same world every launch)", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it("stays within [0, 1)", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashSeed", () => {
  it("maps equal strings to equal seeds and is unsigned 32-bit", () => {
    expect(hashSeed("memory-7")).toEqual(hashSeed("memory-7"));
    expect(hashSeed("memory-7")).not.toEqual(hashSeed("memory-8"));
    expect(hashSeed("anything")).toBeGreaterThanOrEqual(0);
  });
});

describe("range / pick", () => {
  it("range maps a 0.5 draw to the midpoint", () => {
    expect(range(() => 0.5, 10, 20)).toBe(15);
  });

  it("pick selects deterministically from the draw", () => {
    const items = ["a", "b", "c", "d"] as const;
    expect(pick(() => 0, items)).toBe("a");
    expect(pick(() => 0.99, items)).toBe("d");
  });
});
