/** widening.ts — The Widening: the world literally opens up as the companion
 *  matures. Driven by the REAL `pet.stage` signal (backend ladder.py, 1–4), each
 *  stage widens how far you can survey the island and pushes the horizon fog back,
 *  so a young companion lives in a close, misty world that grows vast as it grows
 *  up — "it will grow into this." Pure + unit-tested; World3D/Atmosphere just read
 *  these targets. The stage-up *moment* itself reuses the cubic-out bloomFlash. */

export interface StageReveal {
  surveyDist: number; // camera max zoom-out — how much of the island you can take in
  fogFar: number; // how far the horizon fog reaches before dissolving the world
}

// Indexed by stage 1..4 (index 0 unused). Monotonic — the world only ever opens.
const SURVEY = [95, 95, 110, 128, 150];
const FOG_FAR = [240, 240, 275, 310, 350];

/** The survey/fog targets for a life stage (clamped to 1..4). */
export function stageReveal(stage: number): StageReveal {
  const s = Math.max(1, Math.min(4, Math.round(stage || 1)));
  return { surveyDist: SURVEY[s], fogFar: FOG_FAR[s] };
}
