/** computeDrawSpec â€” the Lumenform's body, as pure data ("humble object").
 *
 *  Returns ordered, back-to-front primitives with *semantic color roles* (never
 *  baked hex) so the renderer applies the live palette and tokens-only holds on
 *  the canvas too. Pure + deterministic: a given stage always yields the same
 *  spec, so it can be snapshot-tested without a GPU. The renderer (Lumenform.ts)
 *  is the only place that touches Pixi.
 *
 *  Local space: origin at the creature's feet, âˆ’y is up.
 */

export type ColorRole = "glow" | "body" | "belly" | "eye" | "limb" | "spark";

export interface LumShape {
  type: "circle" | "ellipse";
  x: number;
  y: number;
  rx: number;
  ry: number;
  role: ColorRole;
  alpha: number;
  rotation?: number;
}

export interface DrawSpec {
  shapes: LumShape[];
  glowRadius: number;
  footprint: number;
}

/** Build the creature for a life stage (1 Hatchling â€¦ 4 Elder). It grows and
 *  gains features â€” ears at 2, a tail at 3, a crown of sparks at 4. */
export function computeDrawSpec(stage: 1 | 2 | 3 | 4): DrawSpec {
  const bodyR = 16 + stage * 5;
  const cy = -bodyR; // body sits a body-radius above the feet
  const shapes: LumShape[] = [];

  // Aura
  shapes.push({ type: "circle", x: 0, y: cy, rx: bodyR * 1.8, ry: bodyR * 1.8, role: "glow", alpha: 0.18 });

  // Ears (Juvenile+) â€” drawn behind the body so they read as nubs
  if (stage >= 2) {
    const ear = bodyR * 0.55;
    shapes.push({ type: "ellipse", x: -bodyR * 0.6, y: cy - bodyR * 0.85, rx: ear * 0.5, ry: ear, role: "body", alpha: 1, rotation: -0.32 });
    shapes.push({ type: "ellipse", x: bodyR * 0.6, y: cy - bodyR * 0.85, rx: ear * 0.5, ry: ear, role: "body", alpha: 1, rotation: 0.32 });
  }

  // Tail (Adult+)
  if (stage >= 3) {
    shapes.push({ type: "ellipse", x: bodyR * 0.95, y: cy + bodyR * 0.5, rx: bodyR * 0.5, ry: bodyR * 0.18, role: "limb", alpha: 0.9, rotation: 0.4 });
  }

  // Body + belly
  shapes.push({ type: "ellipse", x: 0, y: cy, rx: bodyR, ry: bodyR * 1.05, role: "body", alpha: 1 });
  shapes.push({ type: "ellipse", x: 0, y: cy + bodyR * 0.32, rx: bodyR * 0.6, ry: bodyR * 0.5, role: "belly", alpha: 0.5 });

  // Crown of sparks (Elder)
  if (stage >= 4) {
    for (let i = -1; i <= 1; i++) {
      shapes.push({ type: "ellipse", x: i * bodyR * 0.42, y: cy - bodyR * 1.05, rx: bodyR * 0.08, ry: bodyR * 0.32, role: "spark", alpha: 0.9 });
    }
  }

  // Eyes â€” always present
  const eyeR = 2 + stage * 0.7;
  const eyeY = cy - bodyR * 0.08;
  const eyeDx = bodyR * 0.34;
  shapes.push({ type: "circle", x: -eyeDx, y: eyeY, rx: eyeR, ry: eyeR, role: "eye", alpha: 1 });
  shapes.push({ type: "circle", x: eyeDx, y: eyeY, rx: eyeR, ry: eyeR, role: "eye", alpha: 1 });

  return { shapes, glowRadius: bodyR * 1.8, footprint: bodyR * 1.4 };
}
