/** emotion.ts — the companion's emotion vector, derived ONLY from real agent
 *  cadence. The Synapse stream already tells us when tools run, memories form,
 *  skills are drafted and levels are gained; the FSM tells us what the pet is
 *  doing. From that real rhythm we read a continuous {arousal, valence, curiosity,
 *  confidence} and let it colour the pet's glow — so the light visibly breathes
 *  with what the agent is actually doing.
 *
 *  Honesty rules (binding): every input is a real signal. We never infer the
 *  *user's* feelings, and we never fake a negative — valence is "neutral → joyful"
 *  (0.5 = content baseline), lifted only by real wins (level-up, skill draft,
 *  celebrate), because nothing in the system measures sadness. Pure + unit-tested;
 *  the renderer just eases toward what this returns. */

export interface EmotionVector {
  arousal: number; // 0 calm … 1 activated
  valence: number; // 0.5 neutral … 1 joyful (no faked negative — no signal for it)
  curiosity: number; // 0 … 1 — drawn toward new input
  confidence: number; // 0 … 1 — capable / on-task
}

export interface EmotionInput {
  mode: "rest" | "work"; // FSM mode
  gesture: string; // FSM gesture (gaze / celebrate / nap / play / plant / wander / none)
  recentEvents: number; // real Synapse pulses inside the recent window (activity volume)
  msSinceActivity: number; // since the most recent real event (Infinity if none yet)
  msSinceBloom: number; // since the last level-up (a real win)
  msSinceForge: number; // since the last skill draft (a real win)
}

const JOY_TAU = 8000; // a win's joy fades over ~8s
const PRIDE_TAU = 15000; // confidence from a recent skill draft lingers ~15s
const CALM_TAU = 12000; // long idle → fully calm
const EVENT_SAT = 4; // 4+ events in the window → activity saturates

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 1 when fresh → 0 after `tau` ms (a linear decay of a recent spike). */
const fade = (ms: number, tau: number) => clamp01(1 - ms / tau);

/** Map the real cadence onto a continuous emotion vector. */
export function deriveEmotion(i: EmotionInput): EmotionVector {
  const activity = clamp01(i.recentEvents / EVENT_SAT);
  const idleCalm = clamp01(i.msSinceActivity / CALM_TAU);
  const working = i.mode === "work" ? 1 : 0;
  const joy = Math.max(fade(i.msSinceBloom, JOY_TAU), fade(i.msSinceForge, JOY_TAU) * 0.85);
  const celebrating = i.gesture === "celebrate" ? 1 : 0;
  const napping = i.gesture === "nap" ? 1 : 0;
  const gazing = i.gesture === "gaze" ? 1 : 0;

  const arousal = clamp01(activity * 0.6 + working * 0.35 + celebrating * 0.4 + joy * 0.3 - idleCalm * 0.5 - napping * 0.6);
  const valence = clamp01(0.5 + joy * 0.45 + celebrating * 0.3 - napping * 0.1);
  const curiosity = clamp01(0.25 + gazing * 0.6 + activity * 0.35 - napping * 0.3);
  const confidence = clamp01(0.4 + working * 0.4 + fade(i.msSinceForge, PRIDE_TAU) * 0.4 - idleCalm * 0.25);

  return { arousal, valence, curiosity, confidence };
}

/** Translate emotion into the pet's glow: brighter when activated, warmer when
 *  joyful. `warmth` 0 = the neutral ember tone, 1 = the hottest happy glow. */
export function emotionGlow(e: EmotionVector): { lightMul: number; warmth: number } {
  return {
    lightMul: 0.85 + e.arousal * 0.4, // 0.85 calm … 1.25 activated
    warmth: clamp01((e.valence - 0.5) / 0.5), // neutral → 0, joyful → 1
  };
}

/** A one-word read of the emotion vector for the HUD — the same real signal the
 *  glow rides, named. Order matters (most specific first). */
export function moodWord(e: EmotionVector): string {
  if (e.valence > 0.8) return "Elated"; // a real win shows even when otherwise calm
  if (e.confidence > 0.7 && e.arousal > 0.45) return "Focused";
  if (e.curiosity > 0.7) return "Curious"; // gazing reads curious even at low arousal
  if (e.arousal < 0.12) return "Resting"; // nothing else going on
  if (e.arousal > 0.6) return "Excited";
  return "Content";
}
