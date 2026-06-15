/** quality.ts â€” the GPU-tier quality ladder. The world targets 60fps, but the
 *  bioluminescent grade (selective bloom, MSAA, soft shadows, co-located mushroom
 *  lights) is exactly what a weak GPU chokes on. So we read the GL renderer string
 *  once, sort it into a tier, and derive a flag set the render layer consumes â€”
 *  dropping the expensive flourishes first on low-end hardware while keeping the
 *  scene (and all its REAL data) intact.
 *
 *  The stringâ†’tier and tierâ†’flags maps are PURE + unit-tested; only the WebGL
 *  reads (detectGpuTier / hasWebGL) touch the DOM, and they're thin + guarded.
 *  Reduced-motion remains a separate, harder floor (it kills bloom regardless). */

export type Tier = "high" | "medium" | "low";

export interface QualityFlags {
  tier: Tier;
  bloom: boolean; // the selective bloom post-pass (the premium glow)
  msaa: number; // EffectComposer multisampling samples (0 = off)
  shadows: boolean; // directional shadow casting
  shadowMapSize: number; // shadow map resolution when shadows are on
  litMushrooms: number; // how many glow-mushrooms carry a real point-light
  dpr: [number, number]; // Canvas device-pixel-ratio clamp [min, max]
  stars: number; // deep-sky star count
}

// Weak/software/mobile-class renderers â†’ the low tier (no bloom, no shadows).
// `\D*` skips the "(TM)"/"(R)" noise real ANGLE strings wedge before the model number.
const LOW = /(swiftshader|llvmpipe|software|basic render|virgl|mali|adreno\D*[1-5]\d{2}|powervr|videocore|intel.*(hd graphics [2-5]\d{2}|gma))/;
// Strong discrete or modern integrated GPUs â†’ the high tier (the full grade).
const HIGH = /(nvidia|geforce|rtx|gtx|radeon|apple m\d|iris.{0,8}xe|\barc\b)/;

/** Sort a GL `UNMASKED_RENDERER` string into a tier. Unknown/empty â†’ "medium"
 *  (the safe middle â€” never assume a weak machine without evidence). */
export function tierFromRenderer(renderer: string | null | undefined): Tier {
  if (!renderer) return "medium";
  const r = renderer.toLowerCase();
  if (LOW.test(r)) return "low";
  if (HIGH.test(r)) return "high";
  return "medium";
}

/** The render-flag ladder. High = the full bioluminescent grade; low strips the
 *  GPU-heavy flourishes (bloom/shadows/extra lights) so fps holds, scene intact. */
export function qualityFlags(tier: Tier): QualityFlags {
  switch (tier) {
    case "high":
      return { tier, bloom: true, msaa: 8, shadows: true, shadowMapSize: 2048, litMushrooms: 3, dpr: [1, 1.75], stars: 1600 };
    case "medium":
      return { tier, bloom: true, msaa: 4, shadows: true, shadowMapSize: 1024, litMushrooms: 2, dpr: [1, 1.5], stars: 1000 };
    case "low":
      return { tier, bloom: false, msaa: 0, shadows: false, shadowMapSize: 1024, litMushrooms: 0, dpr: [1, 1], stars: 400 };
  }
}

/** Read the GL renderer string from a throwaway context. Returns null when WebGL
 *  is unavailable or the debug-renderer extension is blocked (â†’ caller gets the
 *  "medium" default). Never throws. */
function readRenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) as string | null;
  } catch {
    return null;
  }
}

/** Detect the GPU tier for this machine (one throwaway-context read). */
export function detectGpuTier(): Tier {
  return tierFromRenderer(readRenderer());
}

/** True when a WebGL context can be created at all â€” the gate for the 2D fallback. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
