/** World palette — the 3D Grove's colors in one place (numbers = THREE hex).
 *  A warm-dusk island so it reads as vivid low-poly yet still belongs to
 *  NeuraClaw's dark, ember-accented mood: deep indigo sky, warm sun, the claw
 *  ember reserved for the companion and its crystals (added in later slices). */

export const WORLD = {
  sky: 0x1b2138, // deep dusk indigo — also the fog color
  fog: 0x1b2138,
  sun: 0xffe6b8, // warm low sun
  ambient: 0x5a6b8c, // cool fill from the sky

  water: 0x2b6f8c,
  waterDeep: 0x1d4a5e,

  // Terrain bands, low to high.
  sand: 0xcdbA86,
  grassLow: 0x4f8a47,
  grass: 0x5fa14e,
  grassHigh: 0x6f7f3e,
  rock: 0x7c7a78,
  snow: 0xe9f0f2,

  trunk: 0x6b4a2f,
  pine: 0x4f9a58,
  pineHi: 0x6cbb6c,

  // Memory Garden green — the sprout marker + its glow.
  garden: 0x49d39a,

  // The ember accent (matches the UI's --color-claw) for the companion/crystals.
  ember: 0xe2a04a,
  emberHi: 0xf6dba6,

  // Cool back-rim light — separates silhouettes from the indigo fog.
  rim: 0x8b7bd6,
  // Cool accent for the minority of drifting motes (warm uses emberHi).
  mote: 0x9fd8e6,
} as const;
