/** villageLayout — the single source of building placements + road specs for the
 *  bioluminescent hamlet, all DERIVED from `PLACES_3D` + `PLAZA_POS` so no
 *  coordinate is ever written twice and the whole village re-scales with
 *  `WORLD_SCALE` automatically. Pure (no three, no React) → unit-testable. */

import { PLACES_3D, PLAZA_POS } from "./placeRegistry";

export type BuildingKind = "tavern" | "workshop" | "greenhouse";

const KIND_MAP: Record<string, BuildingKind> = {
  hollow: "tavern",
  workbench: "workshop",
  garden: "greenhouse",
};

export interface BuildingDef {
  id: string; // matches PLACES_3D id ("hollow" | "garden" | "workbench")
  kind: BuildingKind;
  pos: [number, number, number];
  rotationY: number; // radians — building faces the plaza
}

export interface RoadSpec {
  id: string;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  width: number;
  segmentLen: number;
}

const [px, , pz] = PLAZA_POS;

export const BUILDING_DEFS: BuildingDef[] = PLACES_3D.map((p) => ({
  id: p.id,
  kind: KIND_MAP[p.id],
  pos: p.pos,
  rotationY: Math.atan2(px - p.pos[0], pz - p.pos[2]),
}));

export const VILLAGE_ROADS: RoadSpec[] = PLACES_3D.map((p) => ({
  id: `plaza-${p.id}`,
  fromX: px,
  fromZ: pz,
  toX: p.pos[0],
  toZ: p.pos[2],
  width: 2.6,
  segmentLen: 1.5,
}));

export const BUILDING_CLEAR_R = 4.0;
export const PLAZA_CLEAR_R = 5.5;
