import { describe, expect, it } from "vitest";
import { expressionFor } from "./face";

describe("expressionFor", () => {
  it("rest + none → resting", () => {
    expect(expressionFor({ mode: "rest", gesture: "none" })).toBe("resting");
  });

  it("work outranks any gesture → working", () => {
    expect(expressionFor({ mode: "work", gesture: "none" })).toBe("working");
    expect(expressionFor({ mode: "work", gesture: "celebrate" })).toBe("working");
    expect(expressionFor({ mode: "work", gesture: "gaze" })).toBe("working");
  });

  it("maps each gesture (mode rest)", () => {
    expect(expressionFor({ mode: "rest", gesture: "gaze" })).toBe("curious");
    expect(expressionFor({ mode: "rest", gesture: "celebrate" })).toBe("happy");
    expect(expressionFor({ mode: "rest", gesture: "plant" })).toBe("happy");
    expect(expressionFor({ mode: "rest", gesture: "play" })).toBe("playful");
    expect(expressionFor({ mode: "rest", gesture: "nap" })).toBe("lowpower");
    expect(expressionFor({ mode: "rest", gesture: "wander" })).toBe("resting");
  });

  it("is deterministic — same input, same expression", () => {
    const a = expressionFor({ mode: "rest", gesture: "gaze" });
    const b = expressionFor({ mode: "rest", gesture: "gaze" });
    expect(a).toBe(b);
  });

  it("unknown gesture falls back to resting", () => {
    expect(expressionFor({ mode: "rest", gesture: "whatever" })).toBe("resting");
  });
});
