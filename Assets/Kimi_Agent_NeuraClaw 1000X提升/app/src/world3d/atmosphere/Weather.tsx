// ============================================================
// NeuraClaw — Weather System
// Rain, storm clouds, lightning — all procedural
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { useQualityStore } from '@/stores/qualityStore';

export function Weather() {
  const rainRef = useRef<THREE.Points>(null);
  const lightningRef = useRef<THREE.PointLight>(null);
  const { environment } = useWorldStore();
  const quality = useQualityStore((s) => s.quality);
  const { weather } = environment;

  // Rain particles
  const rainCount = Math.floor(8000 * quality.particleDensity);
  const rainPositions = useMemo(() => {
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return positions;
  }, [rainCount]);

  // Clouds
  const cloudCount = Math.floor(15 * quality.particleDensity);
  const clouds = useMemo(() => {
    return Array.from({ length: cloudCount }, () => ({
      position: [
        (Math.random() - 0.5) * 60,
        15 + Math.random() * 10,
        (Math.random() - 0.5) * 60,
      ] as [number, number, number],
      scale: 3 + Math.random() * 5,
      speed: 0.2 + Math.random() * 0.5,
      opacity: 0.3 + Math.random() * 0.3,
    }));
  }, [cloudCount]);

  useFrame((state, delta) => {
    // Rain animation
    if (rainRef.current && (weather === 'rain' || weather === 'storm')) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= (20 + Math.random() * 10) * delta;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 30 + Math.random() * 10;
          positions[i * 3] = (Math.random() - 0.5) * 80;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
      rainRef.current.visible = true;

      const mat = rainRef.current.material as THREE.PointsMaterial;
      mat.opacity = weather === 'storm' ? 0.8 : 0.5;
    } else if (rainRef.current) {
      rainRef.current.visible = false;
    }

    // Lightning
    if (lightningRef.current) {
      if (weather === 'storm' && Math.random() < 0.005) {
        lightningRef.current.intensity = 50 + Math.random() * 100;
        setTimeout(() => {
          if (lightningRef.current) lightningRef.current.intensity = 0;
        }, 50 + Math.random() * 100);
      } else if (weather !== 'storm') {
        lightningRef.current.intensity = 0;
      }
    }

    // Cloud movement
    clouds.forEach((cloud, idx) => {
      const cloudMesh = state.scene.getObjectByName(`cloud-${idx}`);
      if (cloudMesh) {
        cloudMesh.position.x += cloud.speed * delta;
        if (cloudMesh.position.x > 40) cloudMesh.position.x = -40;

        // Visibility based on weather
        const targetOpacity =
          weather === 'storm' ? cloud.opacity * 1.5 :
          weather === 'cloudy' ? cloud.opacity :
          weather === 'rain' ? cloud.opacity * 0.8 :
          0.1;

        const mat = (cloudMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.opacity !== undefined) {
          mat.opacity += (targetOpacity - mat.opacity) * (1 - Math.exp(-2 * delta));
        }
      }
    });
  });

  const showWeather = weather !== 'clear';

  return (
    <group>
      {/* Rain */}
      {quality.particleDensity > 0.1 && (
        <points ref={rainRef} visible={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[rainPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#88AAFF"
            size={0.08}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Lightning */}
      <pointLight
        ref={lightningRef}
        color="#CCDDFF"
        intensity={0}
        distance={100}
        position={[0, 30, 0]}
      />

      {/* Clouds */}
      {showWeather && clouds.map((cloud, i) => (
        <mesh
          key={i}
          name={`cloud-${i}`}
          position={cloud.position}
          scale={cloud.scale}
        >
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#6A6A7A"
            transparent
            opacity={cloud.opacity}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
