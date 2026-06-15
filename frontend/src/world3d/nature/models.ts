/** nature/models â€” the curated low-poly GLB set (Quaternius "Ultimate Stylized
 *  Nature", CC0) used for the island scatter. Files live in public/models/nature/*.glb.
 *  Trees/rocks/bushes round-robin across their list (any length) in Island.tsx, so
 *  growing a list here is enough to add variety â€” no scatter-logic change. */

export const NATURE_TREES = [
  "BirchTree_1",
  "BirchTree_2",
  "BirchTree_3",
  "PineTree_1",
  "PineTree_2",
  "PineTree_3",
  "MapleTree_1",
  "MapleTree_2",
  "NormalTree_1",
  "NormalTree_2",
];
export const NATURE_ROCKS = ["Rock_1", "Rock_2", "Rock_3", "Rock_4", "Rock_5"];
export const NATURE_BUSHES = ["Bush", "Bush_Flowers"];
export const NATURE_GRASS = ["Grass_Large"];

export const NATURE_ALL = [...NATURE_TREES, ...NATURE_ROCKS, ...NATURE_BUSHES, ...NATURE_GRASS];

export const natureUrl = (name: string): string => `/models/nature/${name}.glb`;
