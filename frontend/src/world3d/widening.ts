/** widening.ts — The Widening: the world literally opens up as the companion
 *  matures. Driven by the REAL `pet.stage` signal (backend ladder.py, 1–4), each
 *  stage widens how far you can survey the island and pushes the horizon fog back,
 *  so a young companion lives in a close, misty world that grows vast as it grows
 *  up — "it will grow into this." Pure + unit-tested; World3D/Atmosphere just read
 *  these targets. The stage-up *moment* itself reuses the cubic-out bloomFlash. */

import { getRealmForStage, REALMS } from "./realmData";

export interface StageReveal {
  surveyDist: number; // camera max zoom-out — how much of the island you can take in
  fogFar: number; // how far the horizon fog reaches before dissolving the world
}

/** The survey/fog targets for a life stage. Driven by the Realm system. */
export function stageReveal(stage: number): StageReveal {
  const rounded = isNaN(stage) ? 1 : Math.round(stage);
  const realmId = getRealmForStage(rounded || 1);
  const def = REALMS[realmId];
  return { surveyDist: def.surveyDist, fogFar: def.fogFar };
}
