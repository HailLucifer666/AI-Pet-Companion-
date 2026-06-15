/** ParallaxManager â€” turns one camera position into depth-scaled layer offsets.
 *  Far layers (small depth) barely move; near layers (large depth) shift most,
 *  giving the Grove its sense of volume. */

import type { Container } from "pixi.js";

export interface ParallaxLayer {
  container: Container;
  depth: number; // 0 = locked (sky), 1 = full camera motion (foreground)
}

export class ParallaxManager {
  constructor(private readonly layers: ParallaxLayer[]) {}

  apply(camX: number, camY: number): void {
    for (const { container, depth } of this.layers) {
      container.x = -camX * depth;
      container.y = -camY * depth;
    }
  }
}
