/** Postfx — the Grove's post-processing. A single selective bloom pass: only the
 *  bright/emissive things (the companion's ember body + its light, memory crystals,
 *  place embers) blossom into glow, the matte terrain does not. This is the one
 *  effect that reads as "premium" — restrained, not a haze.
 *
 *  Gated by the caller: reduced-motion AND the low GPU tier render the scene
 *  straight (no composer) — bloom is the first thing to drop on weak hardware. The
 *  MSAA sample count rides the same quality ladder. */

import { EffectComposer, Bloom, Vignette, HueSaturation } from "@react-three/postprocessing";

export function Postfx({ bloom, msaa }: { bloom: boolean; msaa: number }) {
  if (!bloom) return null;

  return (
    <EffectComposer multisampling={msaa}>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.3}
        radius={0.6}
        mipmapBlur
      />
      <HueSaturation saturation={0.15} hue={0} />
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
    </EffectComposer>
  );
}
