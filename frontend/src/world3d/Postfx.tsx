/** Postfx — the Grove's post-processing. A single selective bloom pass: only the
 *  bright/emissive things (the companion's ember body + its light, memory crystals,
 *  place embers) blossom into glow, the matte terrain does not. This is the one
 *  effect that reads as "premium" — restrained, not a haze. Mounted only when motion
 *  is allowed; reduced-motion / weak-GPU paths render the scene straight (no composer).
 *
 *  TODO(perf): gate also on a WebGL2/GPU-tier check once detection exists — bloom is
 *  the first thing to drop on low-end hardware (the public-target fallback).
 */

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useReducedMotion } from "motion/react";

export function Postfx() {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  return (
    <EffectComposer>
      <Bloom
        intensity={0.7}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.3}
        radius={0.6}
        mipmapBlur
      />
    </EffectComposer>
  );
}
