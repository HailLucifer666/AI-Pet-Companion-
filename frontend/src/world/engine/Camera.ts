/** Camera â€” a gentle, breathing point of view. Ambient sway gives the Grove
 *  life even when untouched; pointer parallax lets it lean toward the cursor.
 *  Pure math (no Pixi); the ParallaxManager turns its position into layer offsets.
 */

export class Camera {
  x = 0;
  y = 0;
  private targetX = 0;
  private targetY = 0;
  private t = 0;

  /** Pointer position in normalized [-1, 1] coords (0,0 = center). */
  setPointer(nx: number, ny: number): void {
    this.targetX = nx * 46;
    this.targetY = ny * 26;
  }

  /** dt = ticker.deltaTime (frames at 60fps â‰ˆ 1). sway off under reduced-motion. */
  update(dt: number, sway: boolean): void {
    this.t += dt * 0.006;
    const swayX = sway ? Math.sin(this.t) * 16 : 0;
    const swayY = sway ? Math.cos(this.t * 0.8) * 9 : 0;
    const easing = 1 - Math.pow(1 - 0.05, dt); // frame-rate independent ease
    this.x += (this.targetX + swayX - this.x) * easing;
    this.y += (this.targetY + swayY - this.y) * easing;
  }
}
