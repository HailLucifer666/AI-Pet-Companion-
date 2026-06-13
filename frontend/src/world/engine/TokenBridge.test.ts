import { describe, expect, it } from "vitest";
import { parseColorString } from "./TokenBridge";

describe("parseColorString", () => {
  it("parses #rrggbb", () => {
    expect(parseColorString("#e2a04a")).toBe(0xe2a04a);
    expect(parseColorString("  #FFFFFF ")).toBe(0xffffff);
  });

  it("expands #rgb shorthand", () => {
    expect(parseColorString("#abc")).toBe(0xaabbcc);
  });

  it("parses rgb() and rgba()", () => {
    expect(parseColorString("rgb(226, 160, 74)")).toBe(0xe2a04a);
    expect(parseColorString("rgba(255, 255, 255, 0.5)")).toBe(0xffffff);
  });

  it("clamps channels to a byte", () => {
    expect(parseColorString("rgb(300, 0, 0)")).toBe(0x2c0000); // 300 & 255 = 44
  });

  it("falls back to white on garbage", () => {
    expect(parseColorString("not-a-color")).toBe(0xffffff);
  });
});
