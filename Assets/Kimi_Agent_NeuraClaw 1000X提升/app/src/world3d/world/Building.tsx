// ============================================================
// NeuraClaw — Medieval Building Generator
// Low-poly stylized buildings with bioluminescent accents
// Supports: tavern, workshop, greenhouse/shrine variants
// ============================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DUSK_TOKENS, getGlowColor } from '@/world3d/utils/colors';

export type BuildingVariant = 'tavern' | 'workshop' | 'shrine' | 'cottage' | 'tower';

interface BuildingProps {
  variant?: BuildingVariant;
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  glowIndex?: number;
}

export function Building({
  variant = 'cottage',
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
  glowIndex = 0,
}: BuildingProps) {
  const glowLightRef = useRef<THREE.PointLight>(null);
  const windowGlowRef = useRef<THREE.MeshStandardMaterial>(null);

  // Animated glow pulsing
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = Math.sin(t * 1.5 + glowIndex * 2) * 0.15 + 0.85;
    if (glowLightRef.current) {
      glowLightRef.current.intensity = pulse * 1.2;
    }
    if (windowGlowRef.current) {
      windowGlowRef.current.emissiveIntensity = pulse * 0.8;
    }
  });

  const { geometry, glowColor } = useMemo(() => {
    const color = getGlowColor(glowIndex);
    const buildingColor = new THREE.Color(variant === 'tavern' ? '#6B3A2A' :
      variant === 'workshop' ? '#4A4A5A' :
      variant === 'shrine' ? '#2A4A3A' :
      variant === 'tower' ? '#3A3A4A' :
      '#5A4A3A');

    const group = new THREE.Group();

    // Dimensions
    const w = variant === 'tower' ? 2.5 : variant === 'tavern' ? 5 : 3.5;
    const h = variant === 'tower' ? 8 : variant === 'shrine' ? 3 : 3.5;
    const d = variant === 'tavern' ? 4 : 3;

    // Main body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: buildingColor,
      roughness: 0.85,
      flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof
    const roofH = variant === 'tower' ? 1.5 : 2;
    const roofGeo = variant === 'tower'
      ? new THREE.ConeGeometry(w * 0.75, roofH * 2, 4)
      : new THREE.ConeGeometry(Math.max(w, d) * 0.85, roofH * 2, 4);
    const roofColor = variant === 'tavern' ? '#4A2A1A' :
      variant === 'workshop' ? '#3A3A4A' :
      variant === 'shrine' ? '#2A3A2A' :
      '#3A3A3A';
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.9,
      flatShading: true,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + (variant === 'tower' ? roofH * 0.5 : roofH);
    roof.rotation.y = variant === 'tower' ? Math.PI / 4 : 0;
    roof.castShadow = true;
    group.add(roof);

    // Windows with glow
    const windowSize = 0.5;
    const windowPositions: [number, number, number][] = [];
    if (variant === 'tavern') {
      windowPositions.push([0, h * 0.6, d / 2 + 0.01]);
      windowPositions.push([-1.2, h * 0.6, d / 2 + 0.01]);
      windowPositions.push([1.2, h * 0.6, d / 2 + 0.01]);
    } else {
      windowPositions.push([0, h * 0.55, d / 2 + 0.01]);
      if (variant !== 'tower') {
        windowPositions.push([w / 2 + 0.01, h * 0.55, 0]);
      }
    }

    const glowMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });

    windowPositions.forEach((wp) => {
      const winGeo = new THREE.BoxGeometry(windowSize, windowSize * 1.2, 0.1);
      const win = new THREE.Mesh(winGeo, glowMat.clone());
      win.position.set(...wp);
      group.add(win);
    });

    // Door
    const doorW = variant === 'tavern' ? 1.2 : 0.8;
    const doorH = variant === 'tavern' ? 2 : 1.8;
    const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({
      color: '#3A2A1A',
      roughness: 0.9,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorH / 2, d / 2 + 0.05);
    group.add(door);

    // Chimney (tavern/workshop)
    if (variant === 'tavern' || variant === 'workshop') {
      const chimGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
      const chimMat = new THREE.MeshStandardMaterial({ color: '#4A3A2A', roughness: 0.9, flatShading: true });
      const chimney = new THREE.Mesh(chimGeo, chimMat);
      chimney.position.set(w * 0.3, h + 0.5, 0);
      chimney.castShadow = true;
      group.add(chimney);

      // Ember glow from chimney
      const emberGeo = new THREE.SphereGeometry(0.15, 6, 6);
      const emberMat = new THREE.MeshBasicMaterial({ color: DUSK_TOKENS.ember });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(w * 0.3, h + 1.3, 0);
      group.add(ember);
    }

    // Steps
    const stepGeo = new THREE.BoxGeometry(doorW + 0.3, 0.15, 0.6);
    const stepMat = new THREE.MeshStandardMaterial({ color: '#5A5A5A', roughness: 0.9, flatShading: true });
    const steps = new THREE.Mesh(stepGeo, stepMat);
    steps.position.set(0, 0.075, d / 2 + 0.3);
    steps.receiveShadow = true;
    group.add(steps);

    // Lantern by door
    const lanternGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 6);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.85,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(doorW * 0.7, 1.2, d / 2 + 0.15);
    group.add(lantern);

    // Convert group to single geometry for performance
    const mergedGeos: THREE.BufferGeometry[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        mergedGeos.push(geo);
      }
    });

    return { geometry: group, glowColor: color };
  }, [variant, glowIndex]);

  const glowColorObj = useMemo(() => new THREE.Color(glowColor), [glowColor]);

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={geometry} />

      {/* Glow light */}
      <pointLight
        ref={glowLightRef}
        color={glowColorObj}
        intensity={1.2}
        distance={8}
        position={[0, 2, 2]}
      />

      {/* Window glow material ref (for animation) */}
      <mesh position={[0, -100, 0]} visible={false}>
        <boxGeometry args={[0.01, 0.01, 0.01]} />
        <meshStandardMaterial ref={windowGlowRef} />
      </mesh>
    </group>
  );
}
