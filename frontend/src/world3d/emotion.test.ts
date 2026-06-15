import { describe, expect, it } from "vitest";
import { deriveEmotion, emotionGlow, moodWord, type EmotionInput } from "./emotion";

const CALM: EmotionInput = {
  mode: "rest",
  gesture: "none",
  recentEvents: 0,
  msSinceActivity: Infinity,
  msSinceBloom: Infinity,
  msSinceForge: Infinity,
};

describe("deriveEmotion", () => {
  it("a long-idle resting pet is calm + content", () => {
    const e = deriveEmotion(CALM);
    expect(e.arousal).toBeLessThan(0.15);
    expect(e.valence).toBeCloseTo(0.5, 1); // content baseline, never negative
  });

  it("a busy working pet is highly aroused", () => {
    const e = deriveEmotion({ ...CALM, mode: "work", recentEvents: 5, msSinceActivity: 200 });
    expect(e.arousal).toBeGreaterThan(0.7);
    expect(e.confidence).toBeGreaterThan(0.7);
  });

  it("a fresh level-up spikes joy; an old one decays back to baseline", () => {
    const fresh = deriveEmotion({ ...CALM, msSinceBloom: 0 });
    const old = deriveEmotion({ ...CALM, msSinceBloom: 30000 });
    expect(fresh.valence).toBeGreaterThan(0.8);
    expect(old.valence).toBeCloseTo(0.5, 1);
    expect(fresh.valence).toBeGreaterThan(old.valence);
  });

  it("gazing reads as curious", () => {
    const e = deriveEmotion({ ...CALM, gesture: "gaze" });
    expect(e.curiosity).toBeGreaterThan(0.7);
  });

  it("napping is the lowest arousal", () => {
    const nap = deriveEmotion({ ...CALM, gesture: "nap", msSinceActivity: 1000 });
    expect(nap.arousal).toBe(0);
  });

  it("every component stays within range for extreme inputs", () => {
    const hot = deriveEmotion({ mode: "work", gesture: "celebrate", recentEvents: 99, msSinceActivity: 0, msSinceBloom: 0, msSinceForge: 0 });
    for (const v of Object.values(hot)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("emotionGlow", () => {
  it("calm â†’ dim baseline, activated â†’ brighter", () => {
    expect(emotionGlow(deriveEmotion(CALM)).lightMul).toBeCloseTo(0.85, 1);
    const hot = emotionGlow(deriveEmotion({ ...CALM, mode: "work", recentEvents: 5, msSinceActivity: 100 }));
    expect(hot.lightMul).toBeGreaterThan(1.1);
  });

  it("neutral valence â†’ cool (0 warmth), joyful â†’ warm (â†’1)", () => {
    expect(emotionGlow({ arousal: 0, valence: 0.5, curiosity: 0, confidence: 0 }).warmth).toBe(0);
    expect(emotionGlow({ arousal: 0, valence: 1, curiosity: 0, confidence: 0 }).warmth).toBe(1);
  });
});

describe("moodWord", () => {
  it("a calm long-idle pet reads as Resting", () => {
    expect(moodWord(deriveEmotion(CALM))).toBe("Resting");
  });

  it("a busy working pet reads as Focused", () => {
    const e = deriveEmotion({ ...CALM, mode: "work", recentEvents: 5, msSinceActivity: 200 });
    expect(moodWord(e)).toBe("Focused");
  });

  it("a fresh level-up reads as Elated", () => {
    expect(moodWord(deriveEmotion({ ...CALM, msSinceBloom: 0 }))).toBe("Elated");
  });

  it("gazing reads as Curious", () => {
    expect(moodWord(deriveEmotion({ ...CALM, gesture: "gaze", msSinceActivity: 3000 }))).toBe("Curious");
  });

  it("a mild middle state reads as Content", () => {
    expect(moodWord({ arousal: 0.3, valence: 0.5, curiosity: 0.3, confidence: 0.4 })).toBe("Content");
  });
});
