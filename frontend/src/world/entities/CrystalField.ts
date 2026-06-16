/** CrystalField — memories made visible. Each kept memory plants a light-crystal
 *  on the Grove floor; forgetting one folds it back into the earth. Geometry and
 *  position are derived *deterministically* from the memory id (a memory always
 *  grows the same crystal in the same spot — see makeCrystalSeed), and the five
 *  memory types grow five distinct species so the garden reads at a glance. Shape
 *  is the primary cue (accessible without color); a glow tint is the secondary cue.
 *  Capped so a long session can't grow the scene unbounded.
 */

import { Container, Graphics } from "pixi.js";
import type { Palette } from "../engine/TokenBridge";
import { mulberry32, range } from "../engine/rng";
import { MAX_CRYSTALS, SPECIES, type CrystalSeed } from "./crystalSeed";

// Re-export the pure seed API so existing importers of CrystalField keep working.
export { MAX_CRYSTALS, makeCrystalSeed, SPECIES, type CrystalSeed } from "./crystalSeed";

interface Planted {
  seed: CrystalSeed;
  node: Container;
  grow: number; // 0..1 pop-in progress; <0 = folding out
}

export class CrystalField {
  readonly container = new Container();
  private planted = new Map<number, Planted>();
  private w = 0;
  private h = 0;

  constructor(
    private readonly palette: Palette,
    private readonly reduced: boolean,
  ) {}

  /** Reconcile the scene to `seeds`: plant new ids, fold out ids that vanished
   *  (a forgotten memory). Called whenever the world store changes. */
  sync(seeds: CrystalSeed[], w: number, h: number): void {
    this.w = w;
    this.h = h;
    const live = new Set<number>();
    for (const seed of seeds) {
      live.add(seed.id);
      if (!this.planted.has(seed.id)) this.plant(seed);
    }
    for (const [id, p] of this.planted) {
      if (live.has(id)) continue;
      if (this.reduced) this.drop(id);
      else if (p.grow >= 0) p.grow = -1; // begin folding out; removed in update()
    }
  }

  private plant(seed: CrystalSeed): void {
    const node = this.build(seed);
    node.position.set(seed.nx * this.w, seed.ny * this.h);
    if (this.reduced) {
      node.scale.set(1);
    } else {
      node.scale.set(0);
      node.alpha = 0;
    }
    this.container.addChild(node);
    this.planted.set(seed.id, { seed, node, grow: this.reduced ? 1 : 0 });
    while (this.planted.size > MAX_CRYSTALS) {
      const oldest = this.planted.keys().next().value;
      if (oldest === undefined) break;
      this.drop(oldest);
    }
  }

  private drop(id: number): void {
    const p = this.planted.get(id);
    if (!p) return;
    p.node.destroy({ children: true });
    this.planted.delete(id);
  }

  private build(seed: CrystalSeed): Container {
    const r = mulberry32(seed.seed);
    const node = new Container();
    const spec = SPECIES[seed.memoryType] ?? SPECIES.fact;
    const tint = this.palette[spec.tint];
    const { claw300 } = this.palette;
    const s = range(r, 0.85, 1.2); // per-crystal size jitter

    // Shared bioluminescent halo — every species glows.
    node.addChild(new Graphics().circle(0, -10 * s, 22 * s).fill({ color: tint, alpha: 0.12 }));

    const body = new Graphics();
    switch (spec.kind) {
      case "monolith": {
        // identity — a tall standing slab, unmistakable and rooted.
        const w = 7 * s;
        const ht = 30 * s;
        body.poly([-w, 0, -w, -ht * 0.9, 0, -ht, w, -ht * 0.9, w, 0]).fill({ color: tint, alpha: 0.92 });
        break;
      }
      case "gem": {
        // preference — a faceted round gem.
        const rad = 11 * s;
        body
          .poly([0, -rad * 1.6, rad, -rad * 0.6, rad * 0.6, rad * 0.5, -rad * 0.6, rad * 0.5, -rad, -rad * 0.6])
          .fill({ color: tint, alpha: 0.9 });
        break;
      }
      case "grove": {
        // project — a small cluster of three shards.
        for (const dx of [-6 * s, 0, 6 * s]) {
          const ht = range(r, 14, 26) * s;
          body.poly([dx, 0, dx - 3 * s, -ht * 0.6, dx, -ht, dx + 3 * s, -ht * 0.55]).fill({ color: tint, alpha: 0.88 });
        }
        break;
      }
      case "spire": {
        // event — a thin tall needle.
        const ht = 34 * s;
        body.poly([0, 0, -3 * s, -ht * 0.5, 0, -ht, 3 * s, -ht * 0.5]).fill({ color: tint, alpha: 0.9 });
        break;
      }
      case "quartz": {
        // fact — a short hexagonal prism.
        const w = 9 * s;
        const ht = 18 * s;
        body
          .poly([-w, -ht * 0.3, -w * 0.5, -ht, w * 0.5, -ht, w, -ht * 0.3, w * 0.5, 0, -w * 0.5, 0])
          .fill({ color: tint, alpha: 0.9 });
        break;
      }
    }
    node.addChild(body);
    // A bright inner highlight gives the crystal facet depth.
    node.addChild(
      new Graphics().poly([0, -14 * s, 2 * s, -8 * s, 0, -2 * s]).fill({ color: claw300, alpha: 0.5 }),
    );
    node.rotation = range(r, -0.1, 0.1);
    return node;
  }

  /** Reposition on resize (crystals are pinned to normalized ground coords). */
  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    for (const p of this.planted.values()) p.node.position.set(p.seed.nx * w, p.seed.ny * h);
  }

  /** Animate pop-in and fold-out. No-op once everything is settled. */
  update(dt: number): void {
    if (this.reduced) return;
    const step = 1 - Math.pow(1 - 0.12, dt) || 0.12;
    for (const [id, p] of this.planted) {
      if (p.grow < 0) {
        // Folding back into the earth (a forgotten memory).
        const eased = Math.max(0, p.node.scale.x - step * 1.6);
        p.node.scale.set(eased);
        p.node.alpha = eased;
        if (eased <= 0.001) this.drop(id);
        continue;
      }
      if (p.grow >= 1) continue;
      p.grow = Math.min(1, p.grow + step);
      const eased = 1 - Math.pow(1 - p.grow, 3);
      p.node.scale.set(eased);
      p.node.alpha = eased;
    }
  }
}
