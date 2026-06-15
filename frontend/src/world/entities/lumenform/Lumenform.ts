/** Lumenform renderer â€” the one place that turns the pure DrawSpec + FSM intent
 *  into Pixi. It reads the live palette (tokens-only), moves toward the FSM's
 *  destination, and plays pose/gesture. Under reduced-motion it snaps to where the
 *  state says and never animates: the pet IS where its state says it is.
 */

import { Container, Graphics } from "pixi.js";
import type { Palette } from "../../engine/TokenBridge";
import { PLACES } from "../../../world3d/placeRegistry";
import { computeDrawSpec, type ColorRole } from "./drawSpec";
import type { LumenformState } from "./LumenformFSM";

export class Lumenform {
  readonly container = new Container();
  private readonly art = new Container();
  private readonly bodyG = new Graphics();
  private readonly eyesG = new Graphics();

  private stage: 1 | 2 | 3 | 4 = 1;
  private state: LumenformState;
  private eyeLineY = 0;
  private faceDir = 1;
  private blinkClock = 0;
  private nextBlinkAt = 2.5;

  constructor(
    private readonly palette: Palette,
    private readonly reduced: boolean,
    initial: LumenformState,
  ) {
    this.state = initial;
    this.art.addChild(this.bodyG, this.eyesG);
    this.container.addChild(this.art);
    this.rebuild();
  }

  setState(state: LumenformState): void {
    this.state = state;
  }

  setStage(stage: 1 | 2 | 3 | 4): void {
    if (stage === this.stage) return;
    this.stage = stage;
    this.rebuild();
  }

  private roleColor(role: ColorRole): number {
    const p = this.palette;
    switch (role) {
      case "glow":
        return p.claw500;
      case "body":
        return p.claw600;
      case "belly":
        return p.claw400;
      case "limb":
        return p.claw600;
      case "spark":
        return p.claw300;
      case "eye":
        return p.ink950;
    }
  }

  private rebuild(): void {
    const spec = computeDrawSpec(this.stage);
    this.bodyG.clear();
    this.eyesG.clear();
    for (const sh of spec.shapes) {
      const g = sh.role === "eye" ? this.eyesG : this.bodyG;
      const color = this.roleColor(sh.role);
      if (sh.type === "circle") g.circle(sh.x, sh.y, sh.rx).fill({ color, alpha: sh.alpha });
      else g.ellipse(sh.x, sh.y, sh.rx, sh.ry).fill({ color, alpha: sh.alpha });
      if (sh.role === "eye") this.eyeLineY = sh.y;
    }
    // Blink around the eye line, not the body origin.
    this.eyesG.pivot.set(0, this.eyeLineY);
    this.eyesG.position.set(0, this.eyeLineY);
  }

  /** dt = ticker.deltaTime (≈1 at 60fps); t = seconds. w/h = canvas size. */
  update(dt: number, t: number, w: number, h: number): void {
    const raw = PLACES[this.state.place as Exclude<typeof this.state.place, "wander">]?.anchor || { x: w * 0.5, z: h * 0.5 };
    const target = { x: raw.x, y: raw.z };

    let moving = false;
    if (this.reduced) {
      this.container.position.set(target.x, target.y);
    } else {
      const dx = target.x - this.container.x;
      const dy = target.y - this.container.y;
      moving = Math.hypot(dx, dy) > 1.5;
      const ease = 1 - Math.pow(1 - 0.07, dt);
      this.container.x += dx * ease;
      this.container.y += dy * ease;
      if (Math.abs(dx) > 0.6) this.faceDir = dx < 0 ? -1 : 1;
    }

    if (this.reduced) {
      this.applyStaticPose();
      return;
    }

    // Breathing + locomotion bob.
    const breath = 1 + Math.sin(t * 2) * 0.03;
    const playing = this.state.gesture === "play";
    const bob = moving || playing ? -Math.abs(Math.sin(t * (playing ? 16 : 10))) * 3 : 0;
    let rot = 0;
    let eyeScaleY = 1;
    let artLift = bob;

    switch (this.state.gesture) {
      case "celebrate":
        artLift = -Math.abs(Math.sin(t * 12)) * 11;
        break;
      case "plant":
        rot = 0.14;
        artLift = 3; // lean down to the ground
        break;
      case "gaze":
        rot = -0.05;
        break;
      case "nap":
        eyeScaleY = 0.08;
        artLift = 2;
        break;
    }

    // Idle blink (not while napping).
    if (this.state.gesture !== "nap") {
      this.blinkClock += dt / 60;
      const since = this.blinkClock - this.nextBlinkAt;
      if (since > 0 && since < 0.12) eyeScaleY = 0.1;
      else if (since >= 0.12) {
        this.nextBlinkAt = this.blinkClock + 2 + Math.random() * 3;
      }
    }

    this.art.scale.set(this.faceDir * breath, breath);
    this.art.position.y = artLift;
    this.art.rotation = rot;
    this.eyesG.scale.set(1, eyeScaleY);
  }

  private applyStaticPose(): void {
    this.art.scale.set(this.faceDir, 1);
    this.art.position.y = 0;
    this.art.rotation = 0;
    this.eyesG.scale.set(1, this.state.gesture === "nap" ? 0.08 : 1);
  }
}
