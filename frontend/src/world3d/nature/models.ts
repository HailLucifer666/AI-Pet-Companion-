/** nature/models — the curated low-poly GLB set (Quaternius "Ultimate Stylized
 *  Nature", CC0) used for the island scatter. Phase 1 is a 6-model batch; more
 *  variants get added here later. Files live in public/models/nature/*.glb. */

export const NATURE_TREES = ["BirchTree_1", "PineTree_1", "MapleTree_1"];
export const NATURE_ROCKS = ["Rock_1"];
export const NATURE_BUSHES = ["Bush"];
export const NATURE_GRASS = ["Grass_Large"];

export const NATURE_ALL = [...NATURE_TREES, ...NATURE_ROCKS, ...NATURE_BUSHES, ...NATURE_GRASS];

export const natureUrl = (name: string): string => `/models/nature/${name}.glb`;
