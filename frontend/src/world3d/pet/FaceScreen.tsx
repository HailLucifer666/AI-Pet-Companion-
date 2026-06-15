/** FaceScreen â€” the robot's screen-face: an emissive plane on the head front that
 *  draws two expressive eyes onto a CanvasTexture. The expression comes from the
 *  pure `expressionFor` over the live FSM (worldStore.lumen), so the face reacts to
 *  real events. `meshBasicMaterial` + `toneMapped:false` keeps the cyan eyes HDR-bright
 *  so the world's bloom makes the screen glow. Cheap: one small canvas, redrawn only
 *  when the expression changes. Reduced-motion: still shows the correct expression. */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWorldStore } from "../../state/worldStore";
import { WORLD } from "../palette";
import { expressionFor, type Expression } from "./face";

const W = 256;
const H = 168;
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function arc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.15, Math.PI * 1.85); // upward smile arc (^)
  ctx.stroke();
}

function bar(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx + half, cy);
  ctx.stroke();
}

function drawFace(ctx: CanvasRenderingContext2D, expr: Expression, blink: number): void {
  ctx.clearRect(0, 0, W, H);
  // The dark screen panel.
  ctx.fillStyle = "#0b0e16";
  roundRect(ctx, 6, 6, W - 12, H - 12, 40);
  ctx.fill();

  const eye = hex(WORLD.botEye);
  ctx.fillStyle = eye;
  ctx.strokeStyle = eye;
  ctx.lineCap = "round";
  ctx.shadowColor = eye;
  ctx.shadowBlur = 22;

  const cx1 = W * 0.34;
  const cx2 = W * 0.66;
  const cy = H * 0.5;

  const blinkScale = Math.max(0.05, 1 - blink);

  switch (expr) {
    case "resting":
      ellipse(ctx, cx1, cy, 24, 38 * blinkScale);
      ellipse(ctx, cx2, cy, 24, 38 * blinkScale);
      break;
    case "curious":
      ellipse(ctx, cx1, cy - 8, 32, 46 * blinkScale);
      ellipse(ctx, cx2, cy - 8, 32, 46 * blinkScale);
      break;
    case "working":
      ctx.lineWidth = 18;
      bar(ctx, cx1, cy, 26);
      bar(ctx, cx2, cy, 26);
      break;
    case "happy":
      ctx.lineWidth = 16 * blinkScale;
      arc(ctx, cx1, cy + 14, 30);
      arc(ctx, cx2, cy + 14, 30);
      break;
    case "playful":
      ellipse(ctx, cx1, cy - 6, 28, 42 * blinkScale);
      ellipse(ctx, cx2, cy + 8, 28, 42 * blinkScale);
      break;
    case "lowpower":
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 12;
      bar(ctx, cx1, cy + 6, 22);
      bar(ctx, cx2, cy + 6, 22);
      ctx.globalAlpha = 1;
      break;
  }
  ctx.shadowBlur = 0;
}

export function FaceScreen({ width = 0.34, blinkRef }: { width?: number; blinkRef?: React.MutableRefObject<number> }) {
  const mode = useWorldStore((s) => s.lumen.mode);
  const gesture = useWorldStore((s) => s.lumen.gesture);
  const expr = expressionFor({ mode, gesture });

  const { texture, ctx } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext("2d");
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { texture: tex, ctx: c };
  }, []);

  const lastBlink = useRef(0);
  
  useFrame(() => {
    if (!ctx || !blinkRef) return;
    const current = blinkRef.current;
    if (Math.abs(current - lastBlink.current) > 0.05) {
      lastBlink.current = current;
      drawFace(ctx, expr, current);
      texture.needsUpdate = true;
    }
  });

  useEffect(() => {
    if (!ctx) return;
    const blink = blinkRef ? blinkRef.current : 0;
    drawFace(ctx, expr, blink);
    texture.needsUpdate = true;
  }, [ctx, texture, expr, blinkRef]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Sit just proud of the head sphere's front (râ‰ˆ0.25) so the screen is never
  // occluded by the head, and tilt it a hair upward to face the camera.
  return (
    <mesh position={[0, 0.04, 0.255]} rotation-x={-0.12}>
      <planeGeometry args={[width, (width * H) / W]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
