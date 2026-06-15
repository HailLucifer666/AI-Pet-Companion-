import { describe, expect, it } from "vitest";
import { compostSpec, freshness, parseSqliteUtc } from "./compost";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-06-14T12:00:00Z");

describe("parseSqliteUtc", () => {
  it("reads SQLite's space-separated UTC string as UTC, not local", () => {
    expect(parseSqliteUtc("2026-06-14 12:00:00")).toBe(Date.parse("2026-06-14T12:00:00Z"));
  });

  it("accepts an already-ISO / already-zoned string", () => {
    expect(parseSqliteUtc("2026-06-14T12:00:00Z")).toBe(NOW);
  });

  it("returns null for null, empty, or garbage", () => {
    expect(parseSqliteUtc(null)).toBeNull();
    expect(parseSqliteUtc(undefined)).toBeNull();
    expect(parseSqliteUtc("")).toBeNull();
    expect(parseSqliteUtc("not a date")).toBeNull();
  });
});

describe("freshness", () => {
  it("is ~1 for a just-touched memory", () => {
    expect(freshness(NOW, NOW)).toBeCloseTo(1, 5);
  });

  it("halves over one half-life (14 days)", () => {
    expect(freshness(NOW - 14 * DAY, NOW)).toBeCloseTo(0.5, 5);
  });

  it("floors at FRESH_FLOOR for ancient memories (never fully gone)", () => {
    expect(freshness(NOW - 3650 * DAY, NOW)).toBeCloseTo(0.18, 5);
  });

  it("treats unknown recency (null) as fresh â€” never punishes", () => {
    expect(freshness(null, NOW)).toBe(1);
  });

  it("clamps future timestamps to fresh (no age below zero)", () => {
    expect(freshness(NOW + 5 * DAY, NOW)).toBeCloseTo(1, 5);
  });
});

describe("compostSpec", () => {
  it("a fresh memory stands tall, full-size, full-glow", () => {
    const s = compostSpec(1);
    expect(s.sink).toBeCloseTo(0, 5);
    expect(s.scale).toBeCloseTo(1, 5);
    expect(s.dim).toBeCloseTo(1, 5);
  });

  it("a fully-composted memory sinks, shrinks, and dims â€” but keeps a floor", () => {
    const s = compostSpec(0);
    expect(s.sink).toBeGreaterThan(0.3);
    expect(s.scale).toBeCloseTo(0.5, 5);
    expect(s.dim).toBeCloseTo(0.28, 5);
  });

  it("is monotonic: less fresh sinks more, scales less, dims more", () => {
    const hi = compostSpec(0.8);
    const lo = compostSpec(0.3);
    expect(lo.sink).toBeGreaterThan(hi.sink);
    expect(lo.scale).toBeLessThan(hi.scale);
    expect(lo.dim).toBeLessThan(hi.dim);
  });

  it("clamps out-of-range freshness", () => {
    expect(compostSpec(2)).toEqual(compostSpec(1));
    expect(compostSpec(-1)).toEqual(compostSpec(0));
  });
});
