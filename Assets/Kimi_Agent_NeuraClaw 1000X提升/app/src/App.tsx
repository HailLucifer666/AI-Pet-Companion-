// ============================================================
// NeuraClaw — Main App
// Assembles 3D world + UI overlay
// ============================================================

import { useEffect, useState } from 'react';
import { World3D } from '@/world3d/World3D';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { HUD } from '@/ui/HUD';
import { useQualityStore } from '@/stores/qualityStore';
import { useWorldStore } from '@/stores/worldStore';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const initialize = useQualityStore((s) => s.initialize);
  useWorldStore((s) => s.isLoaded);

  // Initialize GPU detection on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Simulate loading delay then show world
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0D0A1A] relative">
      {/* 3D World */}
      <World3D />

      {/* UI Overlay */}
      <HUD />

      {/* Subtle vignette overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(13, 10, 26, 0.4) 100%)',
        }}
      />
    </div>
  );
}

export default App;
