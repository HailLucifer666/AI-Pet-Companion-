import { describe, expect, it } from "vitest";
import { KEY_TO_DIR, pickByDirection, type Pt } from "./navKeys";

// hollow(center), garden(left), workbench(right), roughly the real layout.
const PLACES: Pt[] = [
  { nx: 0.5, ny: 0.72 }, // 0 center
  { nx: 0.27, ny: 0.64 }, // 1 left
  { nx: 0.76, ny: 0.62 }, // 2 right
];

describe("pickByDirection", () => {
  it("returns the first item when nothing is focused", () => {
    expect(pickByDirection(PLACES, -1, "right")).toBe(0);
  });

  it("moves left/right to the neighbor on that side", () => {
    expect(pickByDirection(PLACES, 0, "left")).toBe(1);
    expect(pickByDirection(PLACES, 0, "right")).toBe(2);
  });

  it("stays put when no Place lies in the pressed direction", () => {
    // From the left-most Place, nothing is further left.
    expect(pickByDirection(PLACES, 1, "left")).toBe(1);
  });

  it("handles an empty set", () => {
    expect(pickByDirection([], 0, "up")).toBe(-1);
  });
});

describe("KEY_TO_DIR", () => {
  it("maps WASD and arrow keys", () => {
    expect(KEY_TO_DIR.w).toBe("up");
    expect(KEY_TO_DIR.a).toBe("left");
    expect(KEY_TO_DIR.arrowright).toBe("right");
    expect(KEY_TO_DIR.x).toBeUndefined();
  });
});
