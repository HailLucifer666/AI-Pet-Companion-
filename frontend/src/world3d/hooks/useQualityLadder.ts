import { create } from 'zustand';
import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { detectGpuTier, Tier } from '../quality';

interface QualityState {
  tier: Tier;
  fps: number;
  setTier: (tier: Tier) => void;
}

export const useQualityStore = create<QualityState>((set) => ({
  tier: detectGpuTier(),
  fps: 60,
  setTier: (tier) => set({ tier }),
}));

export function QualityManager() {
  const { gl } = useThree();
  const setTier = useQualityStore((s) => s.setTier);
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const downgradeTimer = useRef(0);
  const upgradeTimer = useRef(0);

  useEffect(() => {
    // Probe Renderer String on mount
    const context = gl.getContext();
    const rendererInfo = context.getExtension('WEBGL_debug_renderer_info');
    let renderer = '';
    if (rendererInfo) {
      renderer = context.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    } else {
      // For WebGL2 rendering context, RENDERER is on the prototype chain or we can use the constant 0x1F01
      renderer = context.getParameter(0x1F01)?.toLowerCase() || '';
    }
    
    // Heuristic for starting tier
    let initialTier: Tier = 'high';
    if (renderer.includes('intel') || renderer.includes('uhd') || renderer.includes('mesa') || renderer.includes('apple m1')) {
      initialTier = 'medium';
    } else if (renderer.includes('software') || renderer.includes('llvmpipe') || renderer.includes('swiftshader')) {
      initialTier = 'low';
    }

    setTier(initialTier);
  }, [gl, setTier]);

  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    if (currentTime - lastTime.current >= 1000) {
      const currentFps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
      fpsHistory.current.push(currentFps);
      if (fpsHistory.current.length > 5) fpsHistory.current.shift();
      
      const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
      useQualityStore.setState({ fps: Math.round(avgFps) });

      frameCount.current = 0;
      lastTime.current = currentTime;

      const currentTier = useQualityStore.getState().tier;

      // Downgrade if avg FPS < 40 for 2 consecutive checks
      if (avgFps < 40) {
        downgradeTimer.current += 1;
        upgradeTimer.current = 0;
        if (downgradeTimer.current >= 2 && currentTier !== 'low') {
          setTier(currentTier === 'high' ? 'medium' : 'low');
          downgradeTimer.current = 0;
        }
      } 
      // Upgrade if avg FPS > 55 for 3 consecutive checks
      else if (avgFps > 55) {
        upgradeTimer.current += 1;
        downgradeTimer.current = 0;
        if (upgradeTimer.current >= 3 && currentTier !== 'high') {
          setTier(currentTier === 'low' ? 'medium' : 'high');
          upgradeTimer.current = 0;
        }
      } else {
        downgradeTimer.current = 0;
        upgradeTimer.current = 0;
      }
    }
  });

  return null;
}
