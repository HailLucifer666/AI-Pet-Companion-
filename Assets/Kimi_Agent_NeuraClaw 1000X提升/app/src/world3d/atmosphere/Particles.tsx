// ============================================================
// NeuraClaw — Atmospheric Particles
// Ember motes, dust, fireflies, magic sparkles
// Bioluminescent feel — additive blending, slow drift
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityStore } from '@/stores/qualityStore';
import { useWorldStore } from '@/stores/worldStore';
import { DUSK_TOKENS } from '@/world3d/utils/colors';

type ParticleType = 'embers' | 'fireflies' | 'dust' | 'magic';

interface ParticleSystemProps {
  type: ParticleType;
  count?: number;
  area?: number;
  height?: number;
  color?: string;
}

function ParticleSystem({
  type,
  count = 200,
  area = 50,
  height = 10,
  color,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const quality = useQualityStore((s) => s.quality);

  const effectiveCount = Math.floor(count * quality.particleDensity);

  const { positions, colors, speeds } = useMemo(() => {
    const positions = new Float32Array(effectiveCount * 3);
    const colors = new Float32Array(effectiveCount * 3);
    const speeds = new Float32Array(effectiveCount * 3);

    const baseColor = new THREE.Color(
      color || (type === 'embers' ? DUSK_TOKENS.ember :
        type === 'fireflies' ? DUSK_TOKENS.bioGreen :
        type === 'magic' ? DUSK_TOKENS.cyan :
        '#8A7E9E')
    );

    for (let i = 0; i < effectiveCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * area;
      positions[i3 + 1] = Math.random() * height;
      positions[i3 + 2] = (Math.random() - 0.5) * area;

      // Vary colors slightly
      const variedColor = baseColor.clone();
      variedColor.offsetHSL(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      colors[i3] = variedColor.r;
      colors[i3 + 1] = variedColor.g;
      colors[i3 + 2] = variedColor.b;

      speeds[i3] = (Math.random() - 0.5) * 0.3;
      speeds[i3 + 1] = type === 'embers' ? 0.2 + Math.random() * 0.5 :
        type === 'fireflies' ? (Math.random() - 0.5) * 0.3 :
        0.05 + Math.random() * 0.1;
      speeds[i3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    return { positions, colors, speeds };
  }, [effectiveCount, area, height, type, color]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < effectiveCount; i++) {
      const i3 = i * 3;

      // Movement
      posArray[i3] += speeds[i3] * dt + Math.sin(t * 0.5 + i) * 0.01;
      posArray[i3 + 1] += speeds[i3 + 1] * dt;
      posArray[i3 + 2] += speeds[i3 + 2] * dt + Math.cos(t * 0.3 + i) * 0.01;

      // Wrap around
      const halfArea = area / 2;
      if (posArray[i3] > halfArea) posArray[i3] = -halfArea;
      if (posArray[i3] < -halfArea) posArray[i3] = halfArea;
      if (posArray[i3 + 1] > height) posArray[i3 + 1] = 0;
      if (posArray[i3 + 1] < 0) {
        posArray[i3 + 1] = height;
        posArray[i3] = (Math.random() - 0.5) * area;
        posArray[i3 + 2] = (Math.random() - 0.5) * area;
      }
      if (posArray[i3 + 2] > halfArea) posArray[i3 + 2] = -halfArea;
      if (posArray[i3 + 2] < -halfArea) posArray[i3 + 2] = halfArea;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (effectiveCount === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={type === 'fireflies' ? 0.12 : type === 'magic' ? 0.08 : 0.06}
        vertexColors
        transparent
        opacity={type === 'embers' ? 0.7 : 0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Convenience exports
export function EmberMotes() {
  return (
    <group>
      <ParticleSystem type="embers" count={150} area={40} height={15} />
      {/* Plaza ember concentration */}
      <group position={[0, 0, 0]}>
        <ParticleSystem type="embers" count={50} area={10} height={5} color={DUSK_TOKENS.emberGlow} />
      </group>
    </group>
  );
}

export function Fireflies() {
  const { environment } = useWorldStore();
  // Fireflies only at dusk/night
  if (environment.timeOfDay === 'day') return null;

  return (
    <group>
      <ParticleSystem type="fireflies" count={80} area={50} height={8} />
      {/* Garden firefly concentration */}
      <group position={[5, 0, 22]}>
        <ParticleSystem type="fireflies" count={40} area={8} height={4} color={DUSK_TOKENS.bioGreen} />
      </group>
    </group>
  );
}

export function MagicDust() {
  return <ParticleSystem type="magic" count={60} area={30} height={8} color={DUSK_TOKENS.cyan} />;
}

export function DustMotes() {
  return <ParticleSystem type="dust" count={100} area={40} height={6} />;
}

// Combined particle manager
export function Particles() {
  return (
    <group>
      <EmberMotes />
      <Fireflies />
      <MagicDust />
      <DustMotes />
    </group>
  );
}
