// ============================================================
// NeuraClaw — Cobblestone Road System
// Spoke roads from plaza to buildings, path curves
// ============================================================

import { useMemo } from 'react';
import * as THREE from 'three';

interface RoadProps {
  start?: [number, number, number];
  end?: [number, number, number];
  width?: number;
  curve?: boolean;
  glowStones?: boolean;
}

export function Road({
  start = [0, 0, 0],
  end = [10, 0, 0],
  width = 1.8,
  curve = false,
  glowStones = true,
}: RoadProps) {
  const { geometry, glowPositions } = useMemo(() => {
    const group = new THREE.Group();
    const glows: [number, number, number][] = [];

    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const distance = startVec.distanceTo(endVec);
    const segments = Math.max(8, Math.floor(distance * 2));

    const path = curve
      ? new THREE.QuadraticBezierCurve3(
          startVec,
          new THREE.Vector3(
            (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 3,
            0,
            (start[2] + end[2]) / 2 + (Math.random() - 0.5) * 3
          ),
          endVec
        )
      : new THREE.LineCurve3(startVec, endVec);

    // Main road surface
    const roadShape = new THREE.Shape();
    roadShape.moveTo(-width / 2, 0);
    roadShape.lineTo(width / 2, 0);
    roadShape.lineTo(width / 2, distance);
    roadShape.lineTo(-width / 2, distance);
    roadShape.closePath();

    const extrudeSettings = {
      steps: segments,
      depth: 0.02,
      bevelEnabled: false,
    };

    void extrudeSettings; // reserved for future path extrusion
    // Create road segments
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const p0 = path.getPointAt(t0);
      const p1 = path.getPointAt(t1);

      const segLength = p0.distanceTo(p1);
      const angle = Math.atan2(p1.x - p0.x, p1.z - p0.z);

      // Main cobblestone slab
      const stoneGeo = new THREE.BoxGeometry(width * 0.9, 0.05, segLength * 1.1);
      const stoneColor = new THREE.Color(
        0.3 + Math.random() * 0.1,
        0.28 + Math.random() * 0.08,
        0.35 + Math.random() * 0.1
      );
      const stoneMat = new THREE.MeshStandardMaterial({
        color: stoneColor,
        roughness: 0.95,
        flatShading: true,
      });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set((p0.x + p1.x) / 2, 0.02, (p0.z + p1.z) / 2);
      stone.rotation.y = angle;
      stone.receiveShadow = true;
      group.add(stone);

      // Side borders
      const borderGeo = new THREE.BoxGeometry(0.15, 0.08, segLength * 1.1);
      const borderMat = new THREE.MeshStandardMaterial({
        color: '#4A4A5A',
        roughness: 0.9,
        flatShading: true,
      });
      const leftBorder = new THREE.Mesh(borderGeo, borderMat);
      leftBorder.position.set(
        (p0.x + p1.x) / 2 - Math.cos(angle) * (width / 2 + 0.1),
        0.04,
        (p0.z + p1.z) / 2 + Math.sin(angle) * (width / 2 + 0.1)
      );
      leftBorder.rotation.y = angle;
      group.add(leftBorder);

      const rightBorder = new THREE.Mesh(borderGeo, borderMat);
      rightBorder.position.set(
        (p0.x + p1.x) / 2 + Math.cos(angle) * (width / 2 + 0.1),
        0.04,
        (p0.z + p1.z) / 2 - Math.sin(angle) * (width / 2 + 0.1)
      );
      rightBorder.rotation.y = angle;
      group.add(rightBorder);

      // Glow mushrooms along road edges
      if (glowStones && i % 3 === 0) {
        const side = i % 2 === 0 ? 1 : -1;
        const glowPos: [number, number, number] = [
          (p0.x + p1.x) / 2 + Math.cos(angle + Math.PI / 2) * (width / 2 + 0.3) * side,
          0.1,
          (p0.z + p1.z) / 2 + Math.sin(angle + Math.PI / 2) * (width / 2 + 0.3) * side,
        ];
        glows.push(glowPos);

        const mushGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 5, 4);
        const mushColor = ['#39FF14', '#00D4AA', '#9D4EDD', '#FF6B35'][i % 4];
        const mushMat = new THREE.MeshStandardMaterial({
          color: mushColor,
          emissive: mushColor,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.8,
        });
        const mush = new THREE.Mesh(mushGeo, mushMat);
        mush.position.set(...glowPos);
        mush.scale.y = 0.6;
        group.add(mush);
      }
    }

    return { geometry: group, glowPositions: glows };
  }, [start, end, width, curve, glowStones]);

  return (
    <group>
      <primitive object={geometry} />
      {/* Glow lights for mushrooms */}
      {glowPositions.map((pos, i) => (
        <pointLight
          key={i}
          color={['#39FF14', '#00D4AA', '#9D4EDD', '#FF6B35'][i % 4]}
          intensity={0.4}
          distance={2}
          position={pos}
        />
      ))}
    </group>
  );
}
