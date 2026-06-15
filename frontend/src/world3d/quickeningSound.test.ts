import { describe, expect, it } from "vitest";
import {
  birthChimeVoices,
  CHIME_ATTACK,
  CHIME_GAIN,
  CHIME_RELEASE,
} from "./quickeningSound";

describe("birthChimeVoices", () => {
  const voices = birthChimeVoices();

  it("is a four-voice swell", () => {
    expect(voices).toHaveLength(4);
  });

  it("rises in pitch (a major arpeggio)", () => {
    for (let i = 1; i < voices.length; i++) {
      expect(voices[i].freq).toBeGreaterThan(voices[i - 1].freq);
    }
  });

  it("enters one voice at a time (non-negative, strictly increasing delays)", () => {
    expect(voices[0].delay).toBe(0);
    for (let i = 1; i < voices.length; i++) {
      expect(voices[i].delay).toBeGreaterThan(voices[i - 1].delay);
    }
  });

  it("keeps a gentle, audible envelope", () => {
    expect(CHIME_GAIN).toBeGreaterThan(0);
    expect(CHIME_GAIN).toBeLessThan(0.2); // a cue, never a fanfare
    expect(CHIME_ATTACK).toBeGreaterThan(0);
    expect(CHIME_RELEASE).toBeGreaterThan(CHIME_ATTACK);
  });
});
