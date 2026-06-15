// ============================================================
// NeuraClaw — Main 3D World
// Assembles all systems: terrain, village, atmosphere, pet,
// lighting, weather, particles, post-processing, camera
// ============================================================

import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { useWorldStore } from '@/stores/worldStore';
import { useQualityStore } from '@/stores/qualityStore';
import { audioEngine } from './audio/AudioEngine';

import { Terrain } from './world/Terrain';
import { Building } from './world/Building';
import { Plaza } from './world/Plaza';
import { Road } from './world/Road';
import { Props } from './world/Props';
import { Lumenform3D } from './pet/Lumenform3D';

import { Sky } from './atmosphere/Sky';
import { Fog } from './atmosphere/Fog';
import { Weather } from './atmosphere/Weather';
import { Particles } from './atmosphere/Particles';
import { Lighting } from './atmosphere/Lighting';

import { Effects } from './postfx/Effects';
import { CameraRig } from './CameraRig';
import type { BuildingVariant } from './world/Building';

// Village layout
const VILLAGE_BUILDINGS: {
  variant: BuildingVariant;
  position: [number, number, number];
  rotation: number;
  glowIndex: number;
}[] = [
  // Hollow — tavern (chat)
  { variant: 'tavern', position: [-22, 1.2, -12], rotation: 0.8, glowIndex: 0 },
  // Workbench — workshop/forge
  { variant: 'workshop', position: [20, 1.2, -8], rotation: -0.6, glowIndex: 2 },
  // Memory Garden — greenhouse/shrine
  { variant: 'shrine', position: [5, 1.2, 22], rotation: Math.PI, glowIndex: 4 },
  // Extra cottages for village feel
  { variant: 'cottage', position: [-12, 0.8, 18], rotation: -0.3, glowIndex: 1 },
  { variant: 'cottage', position: [18, 0.8, 12], rotation: 0.4, glowIndex: 3 },
  { variant: 'tower', position: [-5, 1, -20], rotation: 0, glowIndex: 5 },
  { variant: 'cottage', position: [-20, 0.8, 5], rotation: 1.2, glowIndex: 6 },
  { variant: 'cottage', position: [12, 0.8, -22], rotation: -1.0, glowIndex: 1 },
];

// Roads connecting plaza to buildings
const ROADS: {
  start: [number, number, number];
  end: [number, number, number];
  curve: boolean;
}[] = [
  // Plaza to Hollow
  { start: [0, 0, 0], end: [-22, 0, -12], curve: true },
  // Plaza to Workbench
  { start: [0, 0, 0], end: [20, 0, -8], curve: false },
  // Plaza to Garden
  { start: [0, 0, 0], end: [5, 0, 22], curve: true },
  // Plaza to extra cottages
  { start: [0, 0, 0], end: [-12, 0, 18], curve: true },
  { start: [0, 0, 0], end: [18, 0, 12], curve: false },
  // Ring road
  { start: [-22, 0, -12], end: [-20, 0, 5], curve: true },
  { start: [20, 0, -8], end: [12, 0, -22], curve: true },
];

function WorldContent() {
  const { setLoaded, advanceTime } = useWorldStore();
  const updateFPS = useQualityStore((s) => s.updateFPS);

  // Initialize
  useEffect(() => {
    setLoaded(true);
    audioEngine.initialize();

    // Time advancement
    const interval = setInterval(() => {
      advanceTime(0.0002); // Slow day cycle
    }, 100);

    return () => {
      clearInterval(interval);
      audioEngine.destroy();
    };
  }, [setLoaded, advanceTime]);

  // FPS counter
  useFrameFPS(updateFPS);

  return (
    <>
      {/* Camera */}
      <CameraRig />

      {/* Lighting */}
      <Lighting />

      {/* Atmosphere */}
      <Sky />
      <Fog />
      <Weather />
      <Particles />

      {/* World */}
      <Terrain radius={40} seed={42} />
      <Plaza />

      {/* Roads */}
      {ROADS.map((road, i) => (
        <Road key={i} {...road} />
      ))}

      {/* Buildings */}
      {VILLAGE_BUILDINGS.map((b, i) => (
        <Building key={i} {...b} />
      ))}

      {/* Props */}
      <Props count={150} radius={40} seed={42} />

      {/* Pet */}
      <Lumenform3D />

      {/* Post-processing */}
      <Effects />

      <Preload all />
    </>
  );
}

// FPS counter hook
function useFrameFPS(onFPS: (fps: number) => void) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let raf: number;
    const track = () => {
      frameCount.current++;
      const now = performance.now();
      if (now - lastTime.current >= 1000) {
        const fps = (frameCount.current * 1000) / (now - lastTime.current);
        onFPS(Math.round(fps));
        frameCount.current = 0;
        lastTime.current = now;
      }
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [onFPS]);
}

export function World3D() {
  const [error] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0D0A1A] text-[#F0E6FF]">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-2">World Temporarily Unavailable</h2>
          <p className="text-sm opacity-60">Your pet is resting. Please refresh to reconnect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{
          fov: 50,
          near: 0.1,
          far: 200,
          position: [12, 8, 12],
        }}
        dpr={[1, 1.5]}
        frameloop="always"
        onCreated={() => {}}
        style={{ background: '#0D0A1A' }}
      >
        <Suspense fallback={null}>
          <WorldContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
