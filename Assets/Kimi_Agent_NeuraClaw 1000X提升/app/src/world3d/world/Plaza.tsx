// ============================================================
// NeuraClaw — Central Plaza / Hearth
// The heart of the village, pet's home
// Cobblestone circle, central fire, bench, well
// ============================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DUSK_TOKENS } from '@/world3d/utils/colors';

export function Plaza() {
  const fireLightRef = useRef<THREE.PointLight>(null);
  const emberRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Flickering fire light
    if (fireLightRef.current) {
      const flicker = Math.sin(t * 10) * 0.1 + Math.sin(t * 23) * 0.08 + Math.sin(t * 47) * 0.05;
      fireLightRef.current.intensity = 2.5 + flicker;
      fireLightRef.current.position.y = 1.5 + flicker * 0.1;
    }

    // Rising embers
    if (emberRef.current) {
      emberRef.current.children.forEach((child, i) => {
        child.position.y += 0.005 * (1 + i * 0.3);
        child.position.x += Math.sin(t * 2 + i) * 0.002;
        const life = (child.position.y - 0.5) / 3;
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = Math.max(0, 1 - life);
        if (child.position.y > 3.5) {
          child.position.y = 0.5;
          child.position.x = (Math.random() - 0.5) * 0.5;
          child.position.z = (Math.random() - 0.5) * 0.5;
          if (mat) mat.opacity = 1;
        }
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Cobblestone ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[7, 24]} />
        <meshStandardMaterial
          color="#5A5A6A"
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Inner circle (hearth area) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[3.5, 20]} />
        <meshStandardMaterial
          color="#6A6A7A"
          roughness={0.9}
          flatShading
        />
      </mesh>

      {/* Central fire pit ring */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <torusGeometry args={[1.2, 0.15, 6, 16]} />
        <meshStandardMaterial
          color="#5A5A5A"
          roughness={0.9}
          flatShading
        />
      </mesh>

      {/* Fire pit stones */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 1.1, 0.2, Math.sin(angle) * 1.1]}
            castShadow
          >
            <dodecahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color="#6A6A6A"
              roughness={0.95}
              flatShading
            />
          </mesh>
        );
      })}

      {/* Fire glow core */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial
          color={DUSK_TOKENS.ember}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Fire light */}
      <pointLight
        ref={fireLightRef}
        color={DUSK_TOKENS.ember}
        intensity={2.5}
        distance={15}
        position={[0, 1.5, 0]}
        castShadow
        shadow-mapSize={[512, 512]}
      />

      {/* Rising embers */}
      <group ref={emberRef}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[(Math.random() - 0.5) * 0.5, 0.5 + i * 0.4, (Math.random() - 0.5) * 0.5]}
          >
            <sphereGeometry args={[0.02 + Math.random() * 0.02, 4, 4]} />
            <meshBasicMaterial
              color={DUSK_TOKENS.emberGlow}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* Well */}
      <group position={[4, 0, 2]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.9, 1.2, 8]} />
          <meshStandardMaterial color="#6A6A6A" roughness={0.9} flatShading />
        </mesh>
        {/* Well water */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.05, 8]} />
          <meshStandardMaterial
            color={DUSK_TOKENS.cyan}
            emissive={DUSK_TOKENS.cyan}
            emissiveIntensity={0.3}
            transparent
            opacity={0.7}
          />
        </mesh>
        {/* Well roof */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <coneGeometry args={[1.1, 0.6, 4]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.9} flatShading />
        </mesh>
      </group>

      {/* Bench */}
      <group position={[-3.5, 0, 1]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[1.5, 0.08, 0.4]} />
          <meshStandardMaterial color="#6B4F3A" roughness={0.9} />
        </mesh>
        <mesh position={[-0.6, 0.15, 0]} castShadow>
          <boxGeometry args={[0.08, 0.3, 0.35]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.9} />
        </mesh>
        <mesh position={[0.6, 0.15, 0]} castShadow>
          <boxGeometry args={[0.08, 0.3, 0.35]} />
          <meshStandardMaterial color="#5A4A3A" roughness={0.9} />
        </mesh>
      </group>

      {/* Plaza lantern posts */}
      {[
        [5, 0, 3],
        [-5, 0, 3],
        [5, 0, -3],
        [-5, 0, -3],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 2.4, 6]} />
            <meshStandardMaterial color="#4A4A4A" roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.12, 0.1, 0.25, 6]} />
            <meshStandardMaterial
              color={DUSK_TOKENS.ember}
              emissive={DUSK_TOKENS.ember}
              emissiveIntensity={1}
              transparent
              opacity={0.8}
            />
          </mesh>
          <pointLight
            color={DUSK_TOKENS.ember}
            intensity={1.5}
            distance={6}
            position={[0, 2.5, 0]}
          />
        </group>
      ))}
    </group>
  );
}
