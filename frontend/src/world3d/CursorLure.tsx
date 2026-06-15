/** CursorLure â€” turns the mouse into a call the companion answers. On pointer-move
 *  over the canvas it raycasts the cursor onto a horizontal plane at the pet's
 *  current ground height and writes that point into the `lure` singleton with a
 *  short expiry, so the pet trots toward wherever you point and, when you stop,
 *  lets the call decay and resumes its own life. A math-plane raycast (no mesh)
 *  avoids terrain occlusion and never intercepts Place clicks or OrbitControls.
 *  Disabled under reduced-motion. Renders nothing. */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { lure, lureControl } from "./lure";
import { petPos } from "./petPosition";

const LURE_HOLD = 2500; // ms the call lingers after the cursor stops moving

export function CursorLure({ reduced }: { reduced: boolean }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (reduced) return;
    const el = gl.domElement;
    const ray = new Raycaster();
    const ndc = new Vector2();
    const hit = new Vector3();
    const ground = new Plane(new Vector3(0, 1, 0), 0); // y = -constant

    const onMove = (e: PointerEvent) => {
      if (!lureControl.enabled) return; // free-roam: ignore the cursor, live its own life
      const rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      ground.constant = -petPos.y; // the plane the pet currently stands on
      if (ray.ray.intersectPlane(ground, hit)) {
        lure.x = hit.x;
        lure.z = hit.z;
        lure.until = performance.now() + LURE_HOLD;
      }
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [gl, camera, reduced]);

  return null;
}
