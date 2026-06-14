/** skyState — the current daylight, shared frame-to-frame outside React. Atmosphere
 *  writes `dayness` (0 night … 1 noon) every frame from `daylightAt(hour)`; the
 *  glowing things (pet, crystals, mushrooms) read it in their own `useFrame` to push
 *  their emissive up at night and ease it down by day — the "full-glow night" grade
 *  — without prop-drilling the hour through the tree. Same pattern as petPosition. */

export const sky = { dayness: 1 };
