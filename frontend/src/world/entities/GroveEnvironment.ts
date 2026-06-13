/** The Grove — the world's first place. Wholly procedural, tokens-only:
 *  a warm moon, a stand of glow-mushrooms, the Hollow's fire, a still pool, and
 *  drifting fireflies. Seeded so it's the *same* Grove every launch. Heavy redraws
 *  happen on layout (resize); per-frame work is just cheap motion (skipped under
 *  reduced-motion). Detail scales with the perf tier.
 */

import { BlurFilter, Container, Graphics } from "pixi.js";
import type { Palette } from "../engine/TokenBridge";
import { mulberry32, range } from "../engine/rng";
import { TIER_SETTINGS, type Tier } from "../engine/FpsDegrader";

const SEED = 0xc1a5fe; // fixed identity of this place
const MAX_FIREFLIES = TIER_SETTINGS.high.fireflies;

interface Firefly {
  gfx: Graphics;
  bx: number; // base position, normalized 0..1
  by: number;
  phase: number;
  speed: number;
  ampX: number;
  ampY: number;
}

export class GroveEnvironment {
  readonly root = new Container();
  readonly layers: { sky: Container; far: Container; mid: Container; near: Container };

  private rnd = mulberry32(SEED);
  private w = 0;
  private h = 0;

  private sky = new Graphics();
  private vignette = new Graphics();
  private moon = new Container();
  private mushrooms = new Graphics();
  private pool = new Graphics();
  private fireGlow = new Container();
  private flames: Graphics[] = [];
  private fireflies: Firefly[] = [];
  private blur = new BlurFilter({ strength: 16, quality: 2 });

  constructor(
    private readonly palette: Palette,
    private readonly reduced: boolean,
  ) {
    const sky = new Container();
    const far = new Container();
    const mid = new Container();
    const near = new Container();
    this.layers = { sky, far, mid, near };
    this.root.addChild(sky, far, mid, near);

    sky.addChild(this.sky, this.moon, this.vignette);
    far.addChild(this.mushrooms);
    mid.addChild(this.pool, this.fireGlow);

    this.buildMoon();
    this.buildFire();
    this.buildFireflies(near);
  }

  private buildMoon(): void {
    const { claw300, claw400 } = this.palette;
    this.moon.addChild(new Graphics().circle(0, 0, 120).fill({ color: claw400, alpha: 0.1 }));
    this.moon.addChild(new Graphics().circle(0, 0, 64).fill({ color: claw400, alpha: 0.16 }));
    this.moon.addChild(new Graphics().circle(0, 0, 30).fill({ color: claw300, alpha: 0.95 }));
    this.moon.filters = [this.blur];
  }

  private buildFire(): void {
    const { claw700, claw600, claw500, claw300 } = this.palette;
    this.fireGlow.addChild(new Graphics().circle(0, 0, 90).fill({ color: claw600, alpha: 0.12 }));
    const colors = [claw700, claw600, claw500, claw300];
    for (let i = 0; i < 4; i++) {
      const f = new Graphics()
        .ellipse(0, 0, 16 - i * 3, 30 - i * 5)
        .fill({ color: colors[i], alpha: 0.85 - i * 0.1 });
      f.y = -i * 4;
      this.flames.push(f);
      this.fireGlow.addChild(f);
    }
    this.fireGlow.filters = [this.blur];
  }

  private buildFireflies(near: Container): void {
    const { claw300, claw400 } = this.palette;
    for (let i = 0; i < MAX_FIREFLIES; i++) {
      const gfx = new Graphics()
        .circle(0, 0, range(this.rnd, 1.4, 2.8))
        .fill({ color: this.rnd() > 0.5 ? claw300 : claw400, alpha: 0.9 });
      near.addChild(gfx);
      this.fireflies.push({
        gfx,
        bx: this.rnd(),
        by: range(this.rnd, 0.18, 0.9),
        phase: range(this.rnd, 0, Math.PI * 2),
        speed: range(this.rnd, 0.4, 1.1),
        ampX: range(this.rnd, 18, 60),
        ampY: range(this.rnd, 12, 40),
      });
    }
  }

  /** Reposition + redraw size-dependent shapes. Call on mount and every resize. */
  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;

    this.sky
      .clear()
      .rect(-80, -80, w + 160, h + 160)
      .fill(this.palette.ink950);

    // A soft pull of warmth from the Hollow, low-left to upper sky.
    this.vignette
      .clear()
      .rect(-80, -80, w + 160, h + 160)
      .fill({ color: this.palette.ink900, alpha: 0 });

    this.moon.position.set(w * 0.8, h * 0.22);
    this.fireGlow.position.set(w * 0.5, h * 0.74);
    this.flames.forEach((f, i) => (f.y = -i * 4));

    this.drawMushrooms(w, h);
    this.drawPool(w, h);
    this.placeFireflies();
  }

  private drawMushrooms(w: number, h: number): void {
    const { ink800, ink850, claw300 } = this.palette;
    const g = this.mushrooms.clear();
    const rnd = mulberry32(SEED ^ 0x9e3779b9); // own stable stream
    const count = Math.max(5, Math.round(w / 150));
    for (let i = 0; i < count; i++) {
      const x = (w / count) * (i + range(rnd, 0.2, 0.8));
      const baseY = h - range(rnd, 0, h * 0.04);
      const stemH = range(rnd, 26, 64);
      const capR = range(rnd, 10, 22);
      g.roundRect(x - 3, baseY - stemH, 6, stemH, 3).fill({ color: ink850, alpha: 0.9 });
      g.ellipse(x, baseY - stemH, capR, capR * 0.6).fill({ color: ink800, alpha: 0.95 });
      g.circle(x, baseY - stemH - 1, range(rnd, 1.5, 3)).fill({ color: claw300, alpha: 0.7 });
    }
  }

  private drawPool(w: number, h: number): void {
    const { ink850, claw600 } = this.palette;
    this.pool
      .clear()
      .ellipse(w * 0.5, h * 0.9, w * 0.26, h * 0.05)
      .fill({ color: ink850, alpha: 0.8 })
      .ellipse(w * 0.5, h * 0.88, w * 0.1, h * 0.012)
      .fill({ color: claw600, alpha: 0.18 });
  }

  private placeFireflies(): void {
    for (const f of this.fireflies) {
      f.gfx.position.set(f.bx * this.w, f.by * this.h);
    }
  }

  /** Per-frame motion. t = seconds-ish accumulator. No-op under reduced-motion. */
  update(dt: number, t: number): void {
    if (this.reduced) return;
    for (const f of this.fireflies) {
      if (!f.gfx.visible) continue;
      const a = t * f.speed + f.phase;
      f.gfx.x = f.bx * this.w + Math.sin(a) * f.ampX;
      f.gfx.y = f.by * this.h + Math.cos(a * 0.7) * f.ampY;
      f.gfx.alpha = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(a * 1.7));
    }
    const flicker = 0.9 + 0.14 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23);
    this.fireGlow.scale.set(flicker, 1.04 + (flicker - 1));
    void dt;
  }

  /** Scale detail to the perf tier: visible firefly count + blur on/off. */
  applyTier(tier: Tier): void {
    const s = TIER_SETTINGS[tier];
    this.fireflies.forEach((f, i) => (f.gfx.visible = i < s.fireflies));
    const useBlur = s.blur && !this.reduced;
    this.moon.filters = useBlur ? [this.blur] : [];
    this.fireGlow.filters = useBlur ? [this.blur] : [];
  }
}
