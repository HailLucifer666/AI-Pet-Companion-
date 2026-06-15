// ============================================================
// NeuraClaw — Dynamic Lighting System
// Sun/moon directional + ambient, time-of-day color temperature
// Lantern point lights, fire glow
// ============================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { useQualityStore } from '@/stores/qualityStore';
import { LIGHT_TEMPERATURES, DUSK_TOKENS } from '@/world3d/utils/colors';

// Temperature to RGB (approximate)
function tempToColor(temp: number): THREE.Color {
  const t = temp / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    if (t <= 19) b = 0;
    else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }

  return new THREE.Color(
    Math.max(0, Math.min(1, r / 255)),
    Math.max(0, Math.min(1, g / 255)),
    Math.max(0, Math.min(1, b / 255))
  );
}

export function Lighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);

  const { environment } = useWorldStore();
  const quality = useQualityStore((s) => s.quality);
  const { timeOfDay, dayProgress } = environment;

  useFrame((_, delta) => {
    const temp = LIGHT_TEMPERATURES[timeOfDay];
    const sunColor = tempToColor(temp);
    const skyColor = new THREE.Color(
      timeOfDay === 'dawn' ? '#7B5EA7' :
      timeOfDay === 'day' ? '#87CEEB' :
      timeOfDay === 'dusk' ? '#FF6B35' :
      '#0D0A1A'
    );
    const groundColor = new THREE.Color(
      timeOfDay === 'night' ? '#0D0A1A' :
      timeOfDay === 'dusk' ? '#2D1B69' :
      '#2A4A2A'
    );

    // Sun position based on time
    const sunAngle = (dayProgress - 0.25) * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * 50;
    const sunY = Math.sin(sunAngle) * 50;
    const sunZ = 20;

    // Sun
    if (sunRef.current) {
      sunRef.current.color.lerp(sunColor, 1 - Math.exp(-3 * delta));
      sunRef.current.position.lerp(
        new THREE.Vector3(sunX, Math.max(sunY, -10), sunZ),
        1 - Math.exp(-2 * delta)
      );
      const intensity = timeOfDay === 'night' ? 0 :
        timeOfDay === 'dusk' || timeOfDay === 'dawn' ? 0.8 :
        1.2;
      sunRef.current.intensity += (intensity - sunRef.current.intensity) * (1 - Math.exp(-3 * delta));
      sunRef.current.castShadow = quality.enableShadows;
    }

    // Ambient
    if (ambientRef.current) {
      const ambientColor = new THREE.Color(
        timeOfDay === 'night' ? '#1A1333' :
        timeOfDay === 'dusk' ? '#3D2B5A' :
        '#7A8A9A'
      );
      ambientRef.current.color.lerp(ambientColor, 1 - Math.exp(-3 * delta));
      const ambientIntensity =
        timeOfDay === 'night' ? 0.15 :
        timeOfDay === 'dusk' || timeOfDay === 'dawn' ? 0.3 :
        0.45;
      ambientRef.current.intensity += (ambientIntensity - ambientRef.current.intensity) * (1 - Math.exp(-3 * delta));
    }

    // Hemisphere
    if (hemiRef.current) {
      hemiRef.current.color.lerp(skyColor, 1 - Math.exp(-3 * delta));
      hemiRef.current.groundColor.lerp(groundColor, 1 - Math.exp(-3 * delta));
      const hemiIntensity =
        timeOfDay === 'night' ? 0.1 :
        timeOfDay === 'dusk' || timeOfDay === 'dawn' ? 0.25 :
        0.4;
      hemiRef.current.intensity += (hemiIntensity - hemiRef.current.intensity) * (1 - Math.exp(-3 * delta));
    }

    // Moon light (night only)
    if (moonRef.current) {
      const moonIntensity = timeOfDay === 'night' ? 0.3 : 0;
      moonRef.current.intensity += (moonIntensity - moonRef.current.intensity) * (1 - Math.exp(-3 * delta));
      if (timeOfDay === 'night') {
        const moonAngle = dayProgress * Math.PI * 2 + Math.PI;
        moonRef.current.position.set(
          Math.cos(moonAngle) * 40,
          30,
          Math.sin(moonAngle) * 40
        );
      }
    }
  });

  return (
    <group>
      {/* Sun / main directional */}
      <directionalLight
        ref={sunRef}
        castShadow={quality.enableShadows}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-bias={-0.001}
        intensity={1.2}
        position={[30, 40, 20]}
      />

      {/* Ambient fill */}
      <ambientLight
        ref={ambientRef}
        intensity={0.3}
        color="#7A8A9A"
      />

      {/* Hemisphere (sky/ground bounce) */}
      <hemisphereLight
        ref={hemiRef}
        color="#87CEEB"
        groundColor="#2A4A2A"
        intensity={0.3}
      />

      {/* Moon (night only, starts at 0) */}
      <directionalLight
        ref={moonRef}
        color="#7B5EA7"
        intensity={0}
        position={[-30, 30, -20]}
      />

      {/* Plaza area lights */}
      <pointLight
        color={DUSK_TOKENS.ember}
        intensity={0.8}
        distance={10}
        position={[0, 2, 0]}
        decay={2}
      />

      {/* Workbench cyan accent */}
      <pointLight
        color={DUSK_TOKENS.cyan}
        intensity={0.4}
        distance={5}
        position={[20, 1.5, -8]}
        decay={2}
      />

      {/* Garden purple accent */}
      <pointLight
        color={DUSK_TOKENS.magicPurple}
        intensity={0.4}
        distance={5}
        position={[5, 1.5, 22]}
        decay={2}
      />
    </group>
  );
}
