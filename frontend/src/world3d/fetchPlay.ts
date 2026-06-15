/** fetchPlay â€” a tiny fetch minigame: throw a glowing spark and the companion
 *  dashes out to it, picks it up, and trots it back to where it set off. Pure
 *  charm (zero XP, fully ignorable) â€” work always wins, so a real tool run pulls
 *  the pet off play. Mirrors lure.ts: a frame-write singleton + a pure transition
 *  function the renderer consumes. Reduced-motion: the pet doesn't chase. */

import type { Vec2 } from "./locomotion";
import { islandHeight, ISLAND_MAX_R } from "./terrain";

export type FetchPhase = "idle" | "outbound" | "return";

export interface FetchToy {
  x: number; // the thrown spot
  z: number;
  homeX: number; // where the pet set off (it brings the spark back here)
  homeZ: number;
  phase: FetchPhase;
}

export const fetchToy: FetchToy = { x: 0, z: 0, homeX: 0, homeZ: 0, phase: "idle" };

const ARRIVE = 1.2; // how close counts as "reached the spark / got home"
const GOLDEN = 2.399963; // golden angle â€” successive throws fan out nicely

/** Where the pet should head next, and the phase after this step. Pure: given the
 *  toy state + the pet's planar position, advance outbound â†’ return â†’ idle. */
export function stepFetch(toy: FetchToy, petX: number, petZ: number): { target: Vec2 | null; phase: FetchPhase } {
  if (toy.phase === "outbound") {
    if (Math.hypot(petX - toy.x, petZ - toy.z) < ARRIVE) return { target: { x: toy.homeX, z: toy.homeZ }, phase: "return" };
    return { target: { x: toy.x, z: toy.z }, phase: "outbound" };
  }
  if (toy.phase === "return") {
    if (Math.hypot(petX - toy.homeX, petZ - toy.homeZ) < ARRIVE) return { target: null, phase: "idle" };
    return { target: { x: toy.homeX, z: toy.homeZ }, phase: "return" };
  }
  return { target: null, phase: "idle" };
}

/** A grassy landing spot a few metres from the pet, fanned by the throw count so
 *  repeated throws scatter rather than stack. Falls back to the pet's feet if the
 *  rim is all water (degenerate, never off the island). */
export function throwSpot(petX: number, petZ: number, n: number): Vec2 {
  for (let i = 0; i < 6; i++) {
    const ang = n * GOLDEN + i * 1.05;
    const dist = 7 + (i % 3);
    const x = petX + Math.cos(ang) * dist;
    const z = petZ + Math.sin(ang) * dist;
    if (islandHeight(x, z, ISLAND_MAX_R) > 0.4) return { x, z };
  }
  return { x: petX, z: petZ };
}

/** Throw the spark to (x,z); the pet sets off from (homeX,homeZ) and returns there. */
export function throwToy(x: number, z: number, homeX: number, homeZ: number): void {
  fetchToy.x = x;
  fetchToy.z = z;
  fetchToy.homeX = homeX;
  fetchToy.homeZ = homeZ;
  fetchToy.phase = "outbound";
}
