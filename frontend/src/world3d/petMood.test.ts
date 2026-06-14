import { describe, expect, it } from "vitest";
import { petEmoji } from "./petMood";

describe("petEmoji — activity → head bubble", () => {
  it("shows a wrench while working, regardless of any transient gesture", () => {
    expect(petEmoji("work", "none")).toBe("🔧");
    expect(petEmoji("work", "gaze")).toBe("🔧"); // work outranks gesture
  });

  it("maps each idle gesture to its emoji", () => {
    expect(petEmoji("rest", "wander")).toBe("🚶");
    expect(petEmoji("rest", "plant")).toBe("🌱");
    expect(petEmoji("rest", "celebrate")).toBe("🎉");
    expect(petEmoji("rest", "gaze")).toBe("👀");
    expect(petEmoji("rest", "nap")).toBe("😴");
    expect(petEmoji("rest", "play")).toBe("🎲");
  });

  it("hides the bubble when simply resting", () => {
    expect(petEmoji("rest", "none")).toBeNull();
  });
});
