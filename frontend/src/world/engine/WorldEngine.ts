/** WorldEngine — the imperative owner of the Pixi Application and the Grove.
 *
 *  Deliberately NOT @pixi/react: React's StrictMode double-mounts in dev, and a
 *  raw class with a `destroyed` flag + cleanup-first teardown is the reliable way
 *  to survive it. `start()` is async (Pixi v8 inits async); if React tears us down
 *  mid-init we detect it after the await and dispose immediately.
 *
 *  Responsibilities: async init, the render/animation loop, frame-rate-driven
 *  detail degradation, resize, WebGL context-loss recovery, pointer parallax, and
 *  a reduced-motion path that renders one static frame and never animates.
 */

import { Application, type Ticker } from "pixi.js";
import { readPalette } from "./TokenBridge";
import { Camera } from "./Camera";
import { ParallaxManager } from "./ParallaxManager";
import { FpsDegrader } from "./FpsDegrader";
import { GroveEnvironment } from "../entities/GroveEnvironment";

export class WorldEngine {
  private app: Application | null = null;
  private destroyed = false;
  private grove: GroveEnvironment | null = null;
  private parallax: ParallaxManager | null = null;
  private readonly camera = new Camera();
  private readonly degrader = new FpsDegrader();
  private readonly reduced: boolean;
  private t = 0;
  private fpsTimer = 0;

  constructor(private readonly host: HTMLElement) {
    this.reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  async start(): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: this.host,
      antialias: true,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      preference: "webgl",
    });
    if (this.destroyed) {
      app.destroy(true, { children: true }); // unmounted during async init (StrictMode)
      return;
    }
    this.app = app;

    app.canvas.style.display = "block";
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    this.host.appendChild(app.canvas);

    const grove = new GroveEnvironment(readPalette(), this.reduced);
    app.stage.addChild(grove.root);
    this.grove = grove;
    this.parallax = new ParallaxManager([
      { container: grove.layers.sky, depth: 0 },
      { container: grove.layers.far, depth: 0.25 },
      { container: grove.layers.mid, depth: 0.55 },
      { container: grove.layers.near, depth: 1 },
    ]);
    grove.layout(app.screen.width, app.screen.height);
    grove.applyTier(this.degrader.current);

    app.renderer.on("resize", this.onResize);
    app.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    app.canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);
    this.host.addEventListener("pointermove", this.onPointer);

    if (this.reduced) {
      app.ticker.stop();
      this.parallax.apply(0, 0);
      app.render(); // a single, still frame — "static but alive"
    } else {
      app.ticker.add(this.onTick);
    }
  }

  private readonly onTick = (ticker: Ticker): void => {
    const app = this.app;
    if (!app || !this.grove || !this.parallax) return;
    const dt = ticker.deltaTime;
    this.t += ticker.deltaMS / 1000;

    this.camera.update(dt, true);
    this.parallax.apply(this.camera.x, this.camera.y);
    this.grove.update(dt, this.t);

    this.fpsTimer += ticker.deltaMS;
    if (this.fpsTimer >= 1000) {
      this.fpsTimer = 0;
      const changed = this.degrader.sample(app.ticker.FPS);
      if (changed) this.grove.applyTier(changed);
    }
  };

  private readonly onResize = (): void => {
    if (!this.app || !this.grove) return;
    this.grove.layout(this.app.screen.width, this.app.screen.height);
    if (this.reduced) this.app.render();
  };

  private readonly onPointer = (e: PointerEvent): void => {
    if (this.reduced) return;
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.camera.setPointer(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      ((e.clientY - r.top) / r.height) * 2 - 1,
    );
  };

  private readonly onContextLost = (e: Event): void => {
    e.preventDefault(); // keep the context recoverable instead of permanently lost
    this.app?.ticker.stop();
  };

  private readonly onContextRestored = (): void => {
    if (!this.app || !this.grove || this.destroyed) return;
    this.grove.layout(this.app.screen.width, this.app.screen.height);
    if (this.reduced) this.app.render();
    else this.app.ticker.start();
  };

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const app = this.app;
    if (!app) return; // start() still mid-init; its post-await guard will dispose
    app.renderer.off("resize", this.onResize);
    app.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    app.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.host.removeEventListener("pointermove", this.onPointer);
    app.destroy(true, { children: true });
    this.app = null;
    this.grove = null;
    this.parallax = null;
  }
}
