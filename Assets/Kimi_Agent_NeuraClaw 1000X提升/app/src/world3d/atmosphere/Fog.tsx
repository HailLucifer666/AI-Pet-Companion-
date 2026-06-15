// ============================================================
// NeuraClaw — Volumetric Fog
// Dynamic fog colors per time of day + weather
// ============================================================

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { FOG_COLORS } from '@/world3d/utils/colors';

export function Fog() {
  const { scene } = useThree();
  const currentColor = useRef(new THREE.Color());
  const targetColor = useRef(new THREE.Color());
  const currentDensity = useRef(0.015);

  const { environment } = useWorldStore();
  const { timeOfDay, weather } = environment;

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#2D1B69', 0.015);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame((_, delta) => {
    if (!scene.fog) return;

    const fogColor = FOG_COLORS[timeOfDay]?.[weather] || FOG_COLORS.dusk.clear;
    targetColor.current.set(fogColor);
    currentColor.current.lerp(targetColor.current, 1 - Math.exp(-2 * delta));

    // Weather affects density
    const targetDensity =
      weather === 'fog' ? 0.04 :
      weather === 'rain' ? 0.025 :
      weather === 'storm' ? 0.03 :
      weather === 'cloudy' ? 0.02 :
      0.015;

    currentDensity.current += (targetDensity - currentDensity.current) * (1 - Math.exp(-2 * delta));

    (scene.fog as THREE.FogExp2).color.copy(currentColor.current);
    (scene.fog as THREE.FogExp2).density = currentDensity.current;

    // Sync scene background
    scene.background = currentColor.current;
  });

  return null;
}
