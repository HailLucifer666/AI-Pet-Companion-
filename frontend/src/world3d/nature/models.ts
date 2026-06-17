/** nature/models — the curated low-poly GLB set (Quaternius "Ultimate Stylized
 *  Nature", CC0) used for the island scatter. Files live in public/models/nature/*.glb.
 *  Trees/rocks/bushes round-robin across their list (any length) in Island.tsx, so
 *  growing a list here is enough to add variety — no scatter-logic change. */

export const NATURE_TREES = [
  "PineTree_1",
  "PineTree_2",
  "NormalTree_1",
];
export const NATURE_ROCKS = ["Rock_1", "Rock_2", "Rock_4"];
export const NATURE_BUSHES = ["Bush_Small"];
export const NATURE_GRASS = ["Grass_Large"];

export const NATURE_ALL = [...NATURE_TREES, ...NATURE_ROCKS, ...NATURE_BUSHES, ...NATURE_GRASS];

export const natureUrl = (name: string): string => `/models/nature/${name}.glb`;
