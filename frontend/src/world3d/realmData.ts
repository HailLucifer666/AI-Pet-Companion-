/** realmData.ts — the concentric altitudes of the world.
 *  Defines the continuous "realms" the camera expands through as the companion matures.
 *  Old realms stay standing, so you can always visit earlier places, but each
 *  new realm unlocks new interactive Places and widens the camera boundaries.
 */

import type { Place } from "./placeRegistry";

export type RealmId = "I" | "II" | "III";

export interface RealmDef {
  id: RealmId;
  name: string;
  stageGate: number;     // The minimum pet.stage required to unlock this realm
  surveyDist: number;    // Maximum zoom-out distance for the camera
  fogFar: number;        // Horizon fog distance
  places: Place[];       // The interactive places unlocked and reachable in this realm
}

// Determines the active realm based on stage. (1=Hatchling, 2=Juvenile, 3=Adult, 4=Elder)
export function getRealmForStage(stage: number): RealmId {
  if (stage >= 4) return "III"; // Elder
  if (stage >= 3) return "II";  // Adult
  return "I";                   // Hatchling/Juvenile
}

export const REALMS: Record<RealmId, RealmDef> = {
  "I": {
    id: "I",
    name: "The Bioluminescent Hamlet",
    stageGate: 1,
    surveyDist: 95,
    fogFar: 240,
    // The core village loop
    places: ["hollow", "garden", "workbench", "pool", "wander"]
  },
  "II": {
    id: "II",
    name: "The Outer Ruins",
    stageGate: 3,
    surveyDist: 128,
    fogFar: 310,
    // Expands to include Archives and Tasks/Calendar (Trail markers)
    places: ["hollow", "garden", "workbench", "pool", "wander", "archives", "tasks", "calendar"]
  },
  "III": {
    id: "III",
    name: "The High Keep",
    stageGate: 4,
    surveyDist: 150,
    fogFar: 350,
    // (Future places will be added here)
    places: ["hollow", "garden", "workbench", "pool", "wander", "archives", "tasks", "calendar"]
  }
};
