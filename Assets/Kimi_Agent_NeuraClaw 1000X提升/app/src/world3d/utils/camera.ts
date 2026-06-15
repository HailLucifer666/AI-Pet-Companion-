// ============================================================
// NeuraClaw — Camera Cinematography System
// Smooth eased follow, intelligent framing, FOV dynamics
// Terrain clearance, zoom control
// ============================================================

import * as THREE from 'three';

export interface CameraConfig {
  distance: number;
  height: number;
  lookAtOffset: [number, number, number];
  fov: number;
  easing: number;
}

export const CAMERA_PRESETS: Record<string, CameraConfig> = {
  default: {
    distance: 12,
    height: 6,
    lookAtOffset: [0, 1, 0],
    fov: 50,
    easing: 3,
  },
  close: {
    distance: 6,
    height: 3,
    lookAtOffset: [0, 0.5, 0],
    fov: 45,
    easing: 4,
  },
  wide: {
    distance: 20,
    height: 10,
    lookAtOffset: [0, 1.5, 0],
    fov: 55,
    easing: 2,
  },
  overhead: {
    distance: 3,
    height: 18,
    lookAtOffset: [0, 0, 0],
    fov: 40,
    easing: 3,
  },
};

export function updateCamera(
  camera: THREE.PerspectiveCamera,
  targetPosition: [number, number, number],
  config: CameraConfig,
  delta: number,
  terrainHeightAt?: (x: number, z: number) => number
): void {
  const dt = Math.min(delta, 0.05);
  const easeFactor = 1 - Math.exp(-config.easing * dt);

  // Ideal camera position (spherical around target)
  const idealPos = new THREE.Vector3(
    targetPosition[0] + config.distance * 0.5,
    targetPosition[1] + config.height,
    targetPosition[2] + config.distance * 0.8
  );

  // Terrain clearance
  if (terrainHeightAt) {
    const groundH = terrainHeightAt(idealPos.x, idealPos.z);
    idealPos.y = Math.max(idealPos.y, groundH + 2);
  }

  // Smooth position
  camera.position.lerp(idealPos, easeFactor);

  // Look at
  const lookAtTarget = new THREE.Vector3(
    targetPosition[0] + config.lookAtOffset[0],
    targetPosition[1] + config.lookAtOffset[1],
    targetPosition[2] + config.lookAtOffset[2]
  );

  const currentLookAt = new THREE.Vector3(0, 0, -1);
  currentLookAt.applyQuaternion(camera.quaternion).add(camera.position);
  currentLookAt.lerp(lookAtTarget, easeFactor);
  camera.lookAt(currentLookAt);

  // FOV dynamics
  const targetFOV = config.fov;
  camera.fov += (targetFOV - camera.fov) * easeFactor;
  camera.updateProjectionMatrix();
}

// Get terrain height at position (simplified)
export function getTerrainHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  const maxH = 6;
  const radius = 40;
  if (dist > radius) return -1;
  let h = maxH * Math.max(0, 1 - Math.pow(dist / radius, 2.5));
  h *= 0.7 + Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.3;
  return Math.max(0, h);
}
