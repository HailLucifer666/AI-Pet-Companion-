import { describe, expect, it } from "vitest";
import { tierFromRenderer, qualityFlags } from "./quality";

describe("tierFromRenderer", () => {
  it("software/SwiftShader renderers → low", () => {
    expect(tierFromRenderer("Google SwiftShader")).toBe("low");
    expect(tierFromRenderer("llvmpipe (LLVM 12.0.0, 256 bits)")).toBe("low");
    expect(tierFromRenderer("Microsoft Basic Render Driver")).toBe("low");
  });

  it("mobile-class GPUs → low", () => {
    expect(tierFromRenderer("Mali-G72")).toBe("low");
    expect(tierFromRenderer("Adreno (TM) 430")).toBe("low");
    expect(tierFromRenderer("Intel(R) HD Graphics 400")).toBe("low");
  });

  it("strong discrete / modern integrated → high", () => {
    expect(tierFromRenderer("ANGLE (NVIDIA GeForce RTX 3080 Direct3D11)")).toBe("high");
    expect(tierFromRenderer("AMD Radeon RX 6800 XT")).toBe("high");
    expect(tierFromRenderer("Apple M2")).toBe("high");
    expect(tierFromRenderer("Intel(R) Iris(R) Xe Graphics")).toBe("high");
  });

  it("unknown / blocked renderer → medium (safe middle)", () => {
    expect(tierFromRenderer(null)).toBe("medium");
    expect(tierFromRenderer("")).toBe("medium");
    expect(tierFromRenderer("Some Unlisted GPU 9000")).toBe("medium");
  });

  it("is case-insensitive", () => {
    expect(tierFromRenderer("GOOGLE SWIFTSHADER")).toBe("low");
    expect(tierFromRenderer("nvidia geforce gtx 1660")).toBe("high");
  });
});

describe("qualityFlags — the degrade ladder", () => {
  it("high = the full bioluminescent grade", () => {
    const f = qualityFlags("high");
    expect(f.bloom).toBe(true);
    expect(f.shadows).toBe(true);
    expect(f.litMushrooms).toBe(3);
    expect(f.msaa).toBe(8);
  });

  it("low strips the GPU-heavy flourishes", () => {
    const f = qualityFlags("low");
    expect(f.bloom).toBe(false);
    expect(f.shadows).toBe(false);
    expect(f.msaa).toBe(0);
    expect(f.litMushrooms).toBe(0);
    expect(f.dpr).toEqual([1, 1]);
  });

  it("flourishes degrade monotonically high → medium → low", () => {
    const h = qualityFlags("high");
    const m = qualityFlags("medium");
    const l = qualityFlags("low");
    expect(h.msaa).toBeGreaterThanOrEqual(m.msaa);
    expect(m.msaa).toBeGreaterThanOrEqual(l.msaa);
    expect(h.litMushrooms).toBeGreaterThanOrEqual(m.litMushrooms);
    expect(m.litMushrooms).toBeGreaterThanOrEqual(l.litMushrooms);
    expect(h.dpr[1]).toBeGreaterThanOrEqual(m.dpr[1]);
    expect(m.dpr[1]).toBeGreaterThanOrEqual(l.dpr[1]);
  });

  it("tier is echoed back on the flags", () => {
    expect(qualityFlags("medium").tier).toBe("medium");
  });
});
