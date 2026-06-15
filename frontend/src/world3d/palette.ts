/** World palette â€” the 3D Grove's colors in one place (numbers = THREE hex).
 *  A warm-dusk island so it reads as vivid low-poly yet still belongs to
 *  AI Pet Companion's dark, ember-accented mood: deep indigo sky, warm sun, the claw
 *  ember reserved for the companion and its crystals (added in later slices). */

export const WORLD = {
  sky: 0x1b2138, // deep dusk indigo â€” also the fog color
  fog: 0x1b2138,
  sun: 0xffe6b8, // warm low sun
  moon: 0xd0d8e0, // pale cool moon disc (night)
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

  // Memory Garden green â€” the sprout marker + its glow.
  garden: 0x49d39a,

  // The ember accent (matches the UI's --color-claw) for the companion/crystals.
  ember: 0xe2a04a,
  emberHi: 0xf6dba6,

  // The companion robot: dark plated body, glowing cyan screen-face + ember glow.
  botBody: 0x2b3354, // dark indigo plate
  botPlate: 0x3c466e, // lighter indigo edge plate (higher stages)
  botEye: 0x7fe9ff, // bright cyan screen glow (eyes)
  botGlow: 0xe2a04a, // ember â€” antenna tips + point light, ties to the companion

  // Cool back-rim light â€” separates silhouettes from the indigo fog.
  rim: 0x8b7bd6,
  // Cool accent for the minority of drifting motes (warm uses emberHi).
  mote: 0x9fd8e6,
} as const;

/** The medieval hamlet's stone/timber/roof/cobble tones â€” dark dusk surfaces the
 *  emissive windows, lanterns, crystals and mushrooms glow against. */
export const VILLAGE = {
  stoneDark: 0x2a2730,
  stoneHi: 0x3a3545,
  timberDark: 0x2e2016,
  roofDark: 0x1a1520,
  plazaCobble: 0x6a6150, // lighter warm cobble â€” reads against the dark grass
  roadCobble: 0x7a6e54,
  fenceWood: 0x4a3822,
} as const;
