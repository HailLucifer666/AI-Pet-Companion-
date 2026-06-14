import { describe, expect, it } from "vitest";
import { speechSnippet } from "./useVoice";

describe("speechSnippet", () => {
  it("returns short text unchanged", () => {
    expect(speechSnippet("Hi there!")).toBe("Hi there!");
  });

  it("collapses runs of whitespace", () => {
    expect(speechSnippet("a   b\n\nc")).toBe("a b c");
  });

  it("keeps the most recent slice for long text, prefixed with an ellipsis", () => {
    const long = "x".repeat(200) + " end of the thought.";
    const out = speechSnippet(long, 40);
    expect(out.startsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(42);
    expect(out).toContain("end of the thought.");
  });

  it("starts the tail at a sentence boundary when one is present", () => {
    const text = "First sentence here. Second sentence is the latest one now.";
    const out = speechSnippet(text, 45);
    expect(out).toContain("Second sentence is the latest one now.");
    expect(out).not.toContain("First sentence");
  });
});
