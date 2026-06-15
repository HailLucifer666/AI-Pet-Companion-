import { describe, expect, it } from "vitest";
import { petEmoji } from "./petMood";

describe("petEmoji â€” activity â†’ head bubble", () => {
  it("shows a wrench while working, regardless of any transient gesture", () => {
    expect(petEmoji("work", "none")).toBe("ðŸ”§");
    expect(petEmoji("work", "gaze")).toBe("ðŸ”§"); // work outranks gesture
  });

  it("maps each idle gesture to its emoji", () => {
    expect(petEmoji("rest", "wander")).toBe("ðŸš¶");
    expect(petEmoji("rest", "plant")).toBe("ðŸŒ±");
    expect(petEmoji("rest", "celebrate")).toBe("ðŸŽ‰");
    expect(petEmoji("rest", "gaze")).toBe("ðŸ‘€");
    expect(petEmoji("rest", "nap")).toBe("ðŸ˜´");
    expect(petEmoji("rest", "play")).toBe("ðŸŽ²");
  });

  it("hides the bubble when simply resting", () => {
    expect(petEmoji("rest", "none")).toBeNull();
  });
});
