// ============================================================
// NeuraClaw — Filmic Post-Processing Pipeline
// Bloom, vignette, film grain, chromatic aberration, hue/sat
// Quality-gated per GPU tier
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  HueSaturation,
  ChromaticAberration,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useQualityStore } from '@/stores/qualityStore';
import { useWorldStore } from '@/stores/worldStore';

export function Effects() {
  const quality = useQualityStore((s) => s.quality);
  const { environment } = useWorldStore();
  const { timeOfDay } = environment;
  const noiseRef = useRef<any>(null);

  useFrame((state) => {
    // Disabled for now to fix: Cannot set properties of undefined (setting 'value')
    // if (noiseRef.current && quality.enableFilmGrain) {
    //   noiseRef.current.premultiply = false;
    //   noiseRef.current.opacity.value = 0.08 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    // }
  });

  const vignetteDarkness = timeOfDay === 'night' ? 0.8 : timeOfDay === 'dusk' ? 0.5 : 0.35;

  // Don't render if minimal tier
  if (quality.tier === 'minimal') return <></>;

  return (
    <EffectComposer
      enabled
      multisampling={0}
      frameBufferType={THREE.HalfFloatType}
    >
      <HueSaturation
        key="hue"
        hue={timeOfDay === 'dusk' ? 0.02 : timeOfDay === 'night' ? 0.05 : 0}
        saturation={timeOfDay === 'dusk' ? 0.15 : timeOfDay === 'night' ? -0.1 : 0.05}
      />
      <Vignette
        key="vignette"
        offset={0.35}
        darkness={vignetteDarkness}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      {quality.enableBloom && (
        <Bloom
          key="bloom"
          luminanceThreshold={0.9}
          luminanceSmoothing={0.9}
          intensity={0.4}
          radius={0.6}
          mipmapBlur
        />
      )}
      {quality.enableChromaticAberration && (
        <ChromaticAberration
          key="ca"
          offset={new THREE.Vector2(0.001, 0.001)}
          radialModulation={true}
          modulationOffset={0.5}
        />
      )}
      {quality.enableFilmGrain && (
        <Noise
          key="noise"
          ref={noiseRef}
          opacity={0.08}
          premultiply={false}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
    </EffectComposer>
  );
}
