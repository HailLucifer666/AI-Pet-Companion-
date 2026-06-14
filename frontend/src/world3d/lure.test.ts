import { describe, expect, it } from "vitest";
import { activeLure, type Lure } from "./lure";

const at = (over: Partial<Lure> = {}): Lure => ({ x: 2, z: -3, until: 1000, ...over });

describe("activeLure — answering the user's call", () => {
  it("walks to the cursor point while resting and the call is live", () => {
    expect(activeLure(at(), 500, "rest", false)).toEqual({ x: 2, z: -3 });
  });

  it("ignores the cursor while working (real computation wins)", () => {
    expect(activeLure(at(), 500, "work", false)).toBeNull();
  });

  it("ignores the cursor under reduced-motion", () => {
    expect(activeLure(at(), 500, "rest", true)).toBeNull();
  });

  it("defers to the FSM once the call has decayed", () => {
    expect(activeLure(at({ until: 1000 }), 1000, "rest", false)).toBeNull();
    expect(activeLure(at({ until: 1000 }), 1200, "rest", false)).toBeNull();
  });
});
