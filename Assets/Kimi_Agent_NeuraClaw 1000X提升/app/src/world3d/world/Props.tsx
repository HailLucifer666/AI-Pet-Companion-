// ============================================================
// NeuraClaw — World Props
// Instanced low-poly trees, rocks, fences, grass tufts
// Grove edges, scattered details
// ============================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { useQualityStore } from '@/stores/qualityStore';
import { getGlowColor } from '@/world3d/utils/colors';

interface PropsProps {
  count?: number;
  radius?: number;
  seed?: number;
}

export function Props({ count = 120, radius = 40, seed = 42 }: PropsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const quality = useQualityStore((s) => s.quality);
  const effectiveCount = Math.floor(count * quality.particleDensity);

  // Gentle sway for trees
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      if (child.userData.isTree) {
        child.rotation.z = Math.sin(t * 0.8 + i * 0.5) * 0.02;
        child.rotation.x = Math.cos(t * 0.6 + i * 0.3) * 0.015;
      }
    });
  });

  const props = useMemo(() => {
    const rng = createNoise2D();

    const items: {
      type: 'tree' | 'rock' | 'fence' | 'grass' | 'bush' | 'crystal';
      position: [number, number, number];
      scale: number;
      rotation: number;
      color: string;
    }[] = [];

    const innerRadius = 8; // Don't place inside plaza
    const outerRadius = radius - 2;

    for (let i = 0; i < effectiveCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      // Noise-based clustering (grove edges)
      const clusterNoise = rng(x * 0.05, z * 0.05);
      const edgeBias = r > outerRadius * 0.7 ? 0.6 : 0.2;
      
      if (Math.random() > clusterNoise + edgeBias) continue;

      const typeRoll = Math.random();
      let type: typeof items[0]['type'] = 'tree';
      if (typeRoll < 0.3) type = 'tree';
      else if (typeRoll < 0.5) type = 'rock';
      else if (typeRoll < 0.6) type = 'bush';
      else if (typeRoll < 0.8) type = 'grass';
      else if (typeRoll < 0.95) type = 'fence';
      else type = 'crystal';

      // Height at position (simplified)
      const y = type === 'crystal' ? 0.5 : 0;

      const scale = 0.6 + Math.random() * 0.8;
      const rotation = Math.random() * Math.PI * 2;
      const color = type === 'crystal' ? getGlowColor(i) : '';

      items.push({ type, position: [x, y, z], scale, rotation, color });
    }

    return items;
  }, [effectiveCount, radius, seed]);

  return (
    <group ref={groupRef}>
      {props.map((prop, i) => (
        <group
          key={i}
          position={prop.position}
          scale={prop.scale}
          rotation={[0, prop.rotation, 0]}
          userData={{ isTree: prop.type === 'tree' }}
        >
          {prop.type === 'tree' && <LowPolyTree />}
          {prop.type === 'rock' && <LowPolyRock />}
          {prop.type === 'bush' && <LowPolyBush />}
          {prop.type === 'grass' && <GrassTuft />}
          {prop.type === 'fence' && <FencePost />}
          {prop.type === 'crystal' && <GlowCrystal color={prop.color} />}
        </group>
      ))}
    </group>
  );
}

// --- Low-poly tree ---
function LowPolyTree() {
  const trunkColor = '#4A3728';
  const foliageColors = ['#1A3A2A', '#2A4A35', '#1A4A3A', '#2D5A3A'];
  const foliageColor = foliageColors[Math.floor(Math.random() * foliageColors.length)];

  return (
    <group>
      {/* Trunk */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.6, 5]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} flatShading />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 2, 0]} castShadow>
        <coneGeometry args={[1.2, 1.8, 5]} />
        <meshStandardMaterial color={foliageColor} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[0.9, 1.4, 5]} />
        <meshStandardMaterial color={foliageColor} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 3.4, 0]}>
        <coneGeometry args={[0.5, 0.8, 5]} />
        <meshStandardMaterial color={foliageColor} roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// --- Low-poly rock ---
function LowPolyRock() {
  const colors = ['#5A5A6A', '#6A6A7A', '#4A4A5A', '#5A5A5A'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <mesh position={[0, 0.2, 0]} castShadow receiveShadow rotation={[0, Math.random() * Math.PI, 0]}>
      <dodecahedronGeometry args={[0.3 + Math.random() * 0.3, 0]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  );
}

// --- Low-poly bush ---
function LowPolyBush() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#2A4A2A" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.2, 0.25, 0.1]} castShadow>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#1A3A1A" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

// --- Grass tuft ---
function GrassTuft() {
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[Math.cos(i * 2.1) * 0.08, 0.15, Math.sin(i * 2.1) * 0.08]}
          rotation={[0.1 * i, i * 2.1, 0.05 * i]}
        >
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshStandardMaterial color={i === 1 ? '#3A5A2A' : '#2A4A1A'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// --- Fence post ---
function FencePost() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.1, 0.7, 0.1]} />
        <meshStandardMaterial color="#6B4F3A" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
        <meshStandardMaterial color="#5A3F2A" roughness={0.9} />
      </mesh>
    </group>
  );
}

// --- Glow crystal (memory crystal) ---
function GlowCrystal({ color }: { color: string }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        color={color}
        intensity={0.6}
        distance={3}
        position={[0, 0.4, 0]}
      />
    </group>
  );
}
