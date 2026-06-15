// ============================================================
// NeuraClaw — Pet Face Screen
// Procedural expression display on the robot's face
// Renders eyes, pupils, glow effects
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FaceConfig } from '@/types';

interface FaceScreenProps {
  expression: FaceConfig;
  blinkState: number; // 0-1, 1 = fully open
  size?: number;
}

export function FaceScreen({ expression, blinkState, size = 0.35 }: FaceScreenProps) {
  const screenRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Parse expression color
  const color = useMemo(() => new THREE.Color(expression.color), [expression.color]);

  useFrame((_, delta) => {
    if (glowRef.current) {
      glowRef.current.intensity = THREE.MathUtils.lerp(
        glowRef.current.intensity,
        expression.glowIntensity * 0.8,
        1 - Math.exp(-5 * delta)
      );
    }
    if (materialRef.current) {
      materialRef.current.color.lerp(color, 1 - Math.exp(-8 * delta));
    }
  });

  const eyeOpenness = expression.eyeOpenness * blinkState;
  const pupilOffset = expression.pupilOffset;

  return (
    <group ref={screenRef} position={[0, 0.15, 0.26]}>
      {/* Screen background */}
      <mesh>
        <planeGeometry args={[size * 1.6, size * 0.8]} />
        <meshBasicMaterial color="#0D0A1A" />
      </mesh>

      {/* Glow backing */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[size * 1.7, size * 0.9]} />
        <meshBasicMaterial
          ref={materialRef}
          color={expression.color}
          transparent
          opacity={expression.glowIntensity * 0.3}
        />
      </mesh>

      {/* Left eye */}
      <group position={[-size * 0.3, 0, 0.005]}>
        <mesh scale={[1, eyeOpenness, 1]}>
          <planeGeometry args={[size * 0.35, size * 0.35]} />
          <meshBasicMaterial color={expression.color} />
        </mesh>
        {/* Pupil */}
        <mesh
          position={[pupilOffset[0] * 0.05, pupilOffset[1] * 0.05, 0.01]}
          scale={[1, eyeOpenness, 1]}
        >
          <planeGeometry args={[size * 0.15, size * 0.15]} />
          <meshBasicMaterial color="#0D0A1A" />
        </mesh>
      </group>

      {/* Right eye */}
      <group position={[size * 0.3, 0, 0.005]}>
        <mesh scale={[1, eyeOpenness, 1]}>
          <planeGeometry args={[size * 0.35, size * 0.35]} />
          <meshBasicMaterial color={expression.color} />
        </mesh>
        {/* Pupil */}
        <mesh
          position={[pupilOffset[0] * 0.05, pupilOffset[1] * 0.05, 0.01]}
          scale={[1, eyeOpenness, 1]}
        >
          <planeGeometry args={[size * 0.15, size * 0.15]} />
          <meshBasicMaterial color="#0D0A1A" />
        </mesh>
      </group>

      {/* Glow light */}
      <pointLight
        ref={glowRef}
        color={expression.color}
        intensity={expression.glowIntensity * 0.5}
        distance={1.5}
        position={[0, 0, 0.2]}
      />
    </group>
  );
}
