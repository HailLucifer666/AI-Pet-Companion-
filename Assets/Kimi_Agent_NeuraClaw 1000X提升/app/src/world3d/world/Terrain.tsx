// ============================================================
// NeuraClaw — Procedural Low-Poly Terrain
// Island with noise-based elevation, faceted look
// ============================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { useQualityStore } from '@/stores/qualityStore';

interface TerrainProps {
  radius?: number;
  resolution?: number;
  seed?: number;
  maxHeight?: number;
}

export function Terrain({
  radius = 40,
  resolution: resProp,
  seed = 42,
  maxHeight = 6,
}: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const quality = useQualityStore((s) => s.quality);
  const resolution = resProp || (quality.terrainDetail > 0.7 ? 64 : quality.terrainDetail > 0.4 ? 40 : 24);

  // Sea animation
  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      }
    }
  });

  const { geometry } = useMemo(() => {
    const noise2D = createNoise2D();

    const geo = new THREE.CylinderGeometry(radius, radius, maxHeight, resolution, 8);
    geo.translate(0, -maxHeight / 2, 0);

    const posAttr = geo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    // Palette
    const topColor = new THREE.Color('#2D1B69');
    const midColor = new THREE.Color('#1A1333');
    const bottomColor = new THREE.Color('#0D0A1A');
    const grassColor = new THREE.Color('#1A3A2A');
    const cliffColor = new THREE.Color('#3D2B5A');

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      const distFromCenter = Math.sqrt(x * x + z * z);
      const normalizedDist = distFromCenter / radius;

      // Noise-based height displacement
      const freq = 0.08;
      const noiseVal = noise2D(x * freq, z * freq);
      const noiseVal2 = noise2D(x * freq * 2 + 100, z * freq * 2 + 100) * 0.5;
      const combinedNoise = noiseVal + noiseVal2;

      // Height: higher in center, tapering to edges
      let heightFactor = 1 - Math.pow(normalizedDist, 2.5);
      heightFactor = Math.max(0, heightFactor);

      const newY = combinedNoise * maxHeight * heightFactor + maxHeight * heightFactor * 0.3;

      // Flatten the top for building areas
      let finalY = y;
      if (y > 0) {
        finalY = Math.max(0, newY);
      }

      posAttr.setY(i, finalY);

      // Vertex colors based on height and position
      const color = new THREE.Color();
      if (finalY > maxHeight * 0.6) {
        color.lerpColors(topColor, grassColor, 0.3 + combinedNoise * 0.3);
      } else if (finalY > 0.5) {
        color.lerpColors(midColor, cliffColor, combinedNoise * 0.4 + 0.3);
      } else {
        color.lerpColors(bottomColor, midColor, 0.3);
      }

      // Edge fade to sea
      if (normalizedDist > 0.85) {
        const edgeT = (normalizedDist - 0.85) / 0.15;
        color.lerpColors(color, bottomColor, edgeT);
      }

      colorAttr[i * 3] = color.r;
      colorAttr[i * 3 + 1] = color.g;
      colorAttr[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    geo.computeVertexNormals();

    return { geometry: geo };
  }, [radius, resolution, seed, maxHeight]);

  return (
    <group>
      {/* Main island terrain */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.85}
          metalness={0.05}
          flatShading
        />
      </mesh>

      {/* Sea / ocean plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow={false}>
        <circleGeometry args={[radius * 3, 32]} />
        <meshStandardMaterial
          color="#1A0E3D"
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.85}
          emissive="#0D0A1A"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Cliff edges — dark ring around island */}
      <mesh position={[0, -maxHeight * 0.3, 0]}>
        <cylinderGeometry args={[radius * 0.98, radius * 0.9, maxHeight * 0.6, resolution, 1, true]} />
        <meshStandardMaterial
          color="#0D0A1A"
          roughness={0.9}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
    </group>
  );
}
