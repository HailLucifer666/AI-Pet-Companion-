/** Spatial keyboard navigation for Place hotspots (WASD). Pure geometry over the
 *  Places' normalized coords — picks the nearest Place in the pressed direction,
 *  so a keyboard user can "walk" between them. Tested without a DOM. */

export interface Pt {
  nx: number;
  ny: number;
}

export type Dir = "up" | "down" | "left" | "right";

const VECTORS: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const KEY_TO_DIR: Record<string, Dir> = {
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
};

/** Index of the next Place in `dir` from `current`, or current if none lie that
 *  way. With no current focus (-1), returns the first item. */
export function pickByDirection(points: Pt[], current: number, dir: Dir): number {
  if (points.length === 0) return -1;
  if (current < 0 || current >= points.length) return 0;

  const [dx, dy] = VECTORS[dir];
  const from = points[current];
  let best = current;
  let bestScore = Infinity;

  for (let i = 0; i < points.length; i++) {
    if (i === current) continue;
    const vx = points[i].nx - from.nx;
    const vy = points[i].ny - from.ny;
    if (vx * dx + vy * dy <= 0) continue; // not in this direction
    // Prefer aligned + near: distance plus an off-axis penalty.
    const along = vx * dx + vy * dy;
    const off = Math.abs(vx * dy - vy * dx);
    const score = Math.hypot(vx, vy) + off * 1.5 - along * 0.0;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}
