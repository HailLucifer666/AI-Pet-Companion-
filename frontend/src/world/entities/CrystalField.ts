/** CrystalField — memories made visible. Each formed memory plants a light-crystal
 *  on the Grove floor; deleting drops it from the world. For W-3 these are simple
 *  placeholder shards positioned deterministically from the memory id (so the same
 *  memory always grows in the same spot) — W-5 gives them real species + geometry.
 *  Capped so a long session can't grow the scene unbounded.
 */

import { Container, Graphics } from "pixi.js";
import type { Palette } from "../engine/TokenBridge";
import { mulberry32, range } from "../engine/rng";

export interface CrystalSeed {
  id: number; // memory_id
  seed: number;
  nx: number;
  ny: number;
}

const MAX_CRYSTALS = 48;

interface Planted {
  seed: CrystalSeed;
  node: Container;
  grow: number; // 0..1 pop-in progress
}

export class CrystalField {
  readonly container = new Container();
  private readonly known = new Set<number>();
  private planted: Planted[] = [];
  private w = 0;
  private h = 0;

  constructor(
    private readonly palette: Palette,
    private readonly reduced: boolean,
  ) {}

  /** Add any crystals not yet in the scene; ids already known are skipped. */
  sync(seeds: CrystalSeed[], w: number, h: number): void {
    this.w = w;
    this.h = h;
    for (const seed of seeds) {
      if (this.known.has(seed.id)) continue;
      this.plant(seed);
    }
  }

  private plant(seed: CrystalSeed): void {
    this.known.add(seed.id);
    const node = this.build(seed);
    node.position.set(seed.nx * this.w, seed.ny * this.h);
    const entry: Planted = { seed, node, grow: this.reduced ? 1 : 0 };
    if (this.reduced) node.scale.set(1);
    else {
      node.scale.set(0);
      node.alpha = 0;
    }
    this.container.addChild(node);
    this.planted.push(entry);
    while (this.planted.length > MAX_CRYSTALS) {
      const old = this.planted.shift();
      if (old) {
        this.known.delete(old.seed.id);
        old.node.destroy({ children: true });
      }
    }
  }

  private build(seed: CrystalSeed): Container {
    const r = mulberry32(seed.seed);
    const node = new Container();
    const height = range(r, 16, 30);
    const half = range(r, 4, 7);
    const { claw500, claw300, claw700 } = this.palette;

    node.addChild(new Graphics().circle(0, -height * 0.4, height * 0.9).fill({ color: claw500, alpha: 0.12 }));
    node.addChild(
      new Graphics()
        .poly([0, -height, half, -height * 0.45, half * 0.6, 0, -half * 0.6, 0, -half, -height * 0.45])
        .fill({ color: claw700, alpha: 0.95 }),
    );
    node.addChild(
      new Graphics()
        .poly([0, -height, half * 0.5, -height * 0.5, 0, 0, 0, -height])
        .fill({ color: claw300, alpha: 0.55 }),
    );
    node.rotation = range(r, -0.12, 0.12);
    return node;
  }

  /** Reposition on resize (crystals are pinned to normalized ground coords). */
  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    for (const p of this.planted) p.node.position.set(p.seed.nx * w, p.seed.ny * h);
  }

  /** Animate pop-in. No-op once everything is settled / under reduced-motion. */
  update(dt: number): void {
    if (this.reduced) return;
    const step = (1 - Math.pow(1 - 0.12, dt)) || 0.12;
    for (const p of this.planted) {
      if (p.grow >= 1) continue;
      p.grow = Math.min(1, p.grow + step);
      const eased = 1 - Math.pow(1 - p.grow, 3);
      p.node.scale.set(eased);
      p.node.alpha = eased;
    }
  }
}
