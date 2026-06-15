// ============================================================
// NeuraClaw — Dynamic Sky
// Gradient sky dome that transitions with time of day
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { SKY_GRADIENTS, lerpHex } from '@/world3d/utils/colors';

export function Sky() {
  const skyRef = useRef<THREE.Mesh>(null);
  const { environment } = useWorldStore();
  const { timeOfDay, dayProgress } = environment;

  // Create gradient texture
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return { canvas, ctx, texture };
  }, []);

  useFrame(() => {
    const { ctx, canvas, texture } = gradientTexture;
    const colors = SKY_GRADIENTS[timeOfDay] || SKY_GRADIENTS.dusk;

    // Interpolate between time periods
    let c0 = colors[0], c1 = colors[1], c2 = colors[2], c3 = colors[3];

    // Smooth day progress blending
    if (dayProgress > 0.15 && dayProgress < 0.25) {
      const t = (dayProgress - 0.15) / 0.1;
      c0 = lerpHex(SKY_GRADIENTS.dawn[0], SKY_GRADIENTS.day[0], t);
      c1 = lerpHex(SKY_GRADIENTS.dawn[1], SKY_GRADIENTS.day[1], t);
      c2 = lerpHex(SKY_GRADIENTS.dawn[2], SKY_GRADIENTS.day[2], t);
      c3 = lerpHex(SKY_GRADIENTS.dawn[3], SKY_GRADIENTS.day[3], t);
    } else if (dayProgress > 0.45 && dayProgress < 0.55) {
      const t = (dayProgress - 0.45) / 0.1;
      c0 = lerpHex(SKY_GRADIENTS.day[0], SKY_GRADIENTS.dusk[0], t);
      c1 = lerpHex(SKY_GRADIENTS.day[1], SKY_GRADIENTS.dusk[1], t);
      c2 = lerpHex(SKY_GRADIENTS.day[2], SKY_GRADIENTS.dusk[2], t);
      c3 = lerpHex(SKY_GRADIENTS.day[3], SKY_GRADIENTS.dusk[3], t);
    } else if (dayProgress > 0.75 && dayProgress < 0.85) {
      const t = (dayProgress - 0.75) / 0.1;
      c0 = lerpHex(SKY_GRADIENTS.dusk[0], SKY_GRADIENTS.night[0], t);
      c1 = lerpHex(SKY_GRADIENTS.dusk[1], SKY_GRADIENTS.night[1], t);
      c2 = lerpHex(SKY_GRADIENTS.dusk[2], SKY_GRADIENTS.night[2], t);
      c3 = lerpHex(SKY_GRADIENTS.dusk[3], SKY_GRADIENTS.night[3], t);
    } else if (dayProgress > 0.95 || dayProgress < 0.05) {
      const t = dayProgress > 0.95
        ? (dayProgress - 0.95) / 0.1
        : (dayProgress + 0.05) / 0.1;
      c0 = lerpHex(SKY_GRADIENTS.night[0], SKY_GRADIENTS.dawn[0], t);
      c1 = lerpHex(SKY_GRADIENTS.night[1], SKY_GRADIENTS.dawn[1], t);
      c2 = lerpHex(SKY_GRADIENTS.night[2], SKY_GRADIENTS.dawn[2], t);
      c3 = lerpHex(SKY_GRADIENTS.night[3], SKY_GRADIENTS.dawn[3], t);
    }

    // Fill gradient
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, c0);
    grd.addColorStop(0.3, c1);
    grd.addColorStop(0.6, c2);
    grd.addColorStop(1, c3);

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;

    if (skyRef.current) {
      const mat = skyRef.current.material as THREE.MeshBasicMaterial;
      mat.map = texture;
    }
  });

  return (
    <mesh ref={skyRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[120, 16, 16]} />
      <meshBasicMaterial side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
