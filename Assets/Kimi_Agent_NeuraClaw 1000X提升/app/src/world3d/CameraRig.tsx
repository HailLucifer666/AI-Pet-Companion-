// ============================================================
// NeuraClaw — Camera Rig
// Cinematographer-style follow camera with terrain clearance
// ============================================================

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { updateCamera, getTerrainHeight, CAMERA_PRESETS } from './utils/camera';

export function CameraRig() {
  const { camera } = useThree();
  const pet = useWorldStore((s) => s.pet);
  const targetRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const petPos = pet.position;

    // Smooth target (pet position with micro-lag for fluidity)
    targetRef.current.lerp(
      new THREE.Vector3(petPos[0], petPos[1], petPos[2]),
      1 - Math.exp(-3 * dt)
    );

    // Update camera
    updateCamera(
      camera as THREE.PerspectiveCamera,
      [targetRef.current.x, targetRef.current.y, targetRef.current.z],
      CAMERA_PRESETS.default,
      dt,
      getTerrainHeight
    );
  });

  return null;
}
