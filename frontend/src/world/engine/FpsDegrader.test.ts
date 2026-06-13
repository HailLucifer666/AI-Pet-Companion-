import { describe, expect, it } from "vitest";
import { FpsDegrader } from "./FpsDegrader";

describe("FpsDegrader", () => {
  it("starts at high and holds under good fps", () => {
    const d = new FpsDegrader();
    expect(d.current).toBe("high");
    for (let i = 0; i < 5; i++) expect(d.sample(60)).toBeNull();
    expect(d.current).toBe("high");
  });

  it("degrades a tier after sustained low fps", () => {
    const d = new FpsDegrader();
    expect(d.sample(30)).toBeNull();
    expect(d.sample(30)).toBeNull();
    expect(d.sample(30)).toBe("medium"); // 3rd low sample drops a tier
    expect(d.current).toBe("medium");
  });

  it("walks all the way down under heavy load", () => {
    const d = new FpsDegrader();
    for (let i = 0; i < 3; i++) d.sample(20);
    expect(d.current).toBe("medium");
    for (let i = 0; i < 3; i++) d.sample(20);
    expect(d.current).toBe("low");
    // can't go below low
    for (let i = 0; i < 6; i++) d.sample(20);
    expect(d.current).toBe("low");
  });

  it("does not oscillate on a single bad frame (hysteresis)", () => {
    const d = new FpsDegrader();
    d.sample(30);
    d.sample(30);
    expect(d.sample(60)).toBeNull(); // good frame resets the low run
    expect(d.current).toBe("high");
  });

  it("recovers a tier after a sustained run of good frames", () => {
    const d = new FpsDegrader();
    for (let i = 0; i < 3; i++) d.sample(20); // -> medium
    expect(d.current).toBe("medium");
    let recovered: string | null = null;
    for (let i = 0; i < 8; i++) recovered = d.sample(60) ?? recovered;
    expect(recovered).toBe("high");
    expect(d.current).toBe("high");
  });

  it("exposes settings (firefly count + blur) for the current tier", () => {
    const d = new FpsDegrader();
    expect(d.settings.blur).toBe(true);
    expect(d.settings.fireflies).toBeGreaterThan(0);
  });
});
