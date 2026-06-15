/** FpsDegrader â€” keeps the Grove at 60fps by shedding detail when the frame
 *  budget slips. Monotonic-down with hysteresis: it degrades on sustained low
 *  FPS and only recovers after a sustained run of good frames, so it never
 *  oscillates (flicker is worse than a slightly simpler scene). Decision logic
 *  is pure and unit-tested; the owner feeds it sampled FPS once per second.
 */

export type Tier = "high" | "medium" | "low";

const ORDER: Tier[] = ["high", "medium", "low"];

export interface TierSettings {
  fireflies: number;
  blur: boolean;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high: { fireflies: 38, blur: true },
  medium: { fireflies: 18, blur: false },
  low: { fireflies: 8, blur: false },
};

const DEGRADE_BELOW = 48; // fps; sustained under this drops a tier
const RECOVER_ABOVE = 58; // fps; sustained over this climbs a tier
const DEGRADE_SAMPLES = 3;
const RECOVER_SAMPLES = 8;

export class FpsDegrader {
  private tier: Tier = "high";
  private lowRun = 0;
  private highRun = 0;

  get current(): Tier {
    return this.tier;
  }

  get settings(): TierSettings {
    return TIER_SETTINGS[this.tier];
  }

  /** Feed one FPS sample. Returns the new tier if it changed, else null. */
  sample(fps: number): Tier | null {
    if (fps < DEGRADE_BELOW) {
      this.lowRun++;
      this.highRun = 0;
    } else if (fps > RECOVER_ABOVE) {
      this.highRun++;
      this.lowRun = 0;
    } else {
      this.lowRun = 0;
      this.highRun = 0;
    }

    const idx = ORDER.indexOf(this.tier);
    if (this.lowRun >= DEGRADE_SAMPLES && idx < ORDER.length - 1) {
      this.lowRun = 0;
      this.tier = ORDER[idx + 1];
      return this.tier;
    }
    if (this.highRun >= RECOVER_SAMPLES && idx > 0) {
      this.highRun = 0;
      this.tier = ORDER[idx - 1];
      return this.tier;
    }
    return null;
  }
}
