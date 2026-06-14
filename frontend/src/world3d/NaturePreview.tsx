/** NaturePreview — DEV-only. Renders the freshly-converted Quaternius GLBs in a
 *  row on the island so I can eyeball them under the real world lighting before
 *  wiring them into the scatter. Mounted in World3D only when the URL has
 *  `?nature=1` (and only in dev builds). Each model is normalised: centred on XZ,
 *  its base sat on the ground, scaled so its largest dimension is 1 unit, then
 *  shown at a common display scale. Phase 1 of the V-3 nature pass — temporary. */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import { islandHeight, ISLAND_MAX_R } from "./terrain";

const MODELS = ["BirchTree_1", "PineTree_1", "MapleTree_1", "Rock_1", "Bush", "Grass_Large"];
const SHOW_SCALE = 2.2; // display size after unit-normalisation
const SPACING = 3.2;

function NormalizedModel({ url, x, z }: { url: string; x: number; z: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => (scene.clone(true) as unknown) as Group, [scene]);
  const { scale, offset } = useMemo(() => {
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { scale: 1 / maxDim, offset: [-center.x, -box.min.y, -center.z] as [number, number, number] };
  }, [cloned]);

  const y = islandHeight(x, z, ISLAND_MAX_R);
  return (
    <group position={[x, y, z]}>
      <group scale={SHOW_SCALE}>
        <group scale={scale}>
          <primitive object={cloned} position={offset} />
        </group>
      </group>
    </group>
  );
}

export function NaturePreview() {
  return (
    <group>
      {MODELS.map((name, i) => (
        <NormalizedModel
          key={name}
          url={`/models/nature/${name}.glb`}
          x={(i - (MODELS.length - 1) / 2) * SPACING}
          z={-1}
        />
      ))}
    </group>
  );
}

MODELS.forEach((name) => useGLTF.preload(`/models/nature/${name}.glb`));
