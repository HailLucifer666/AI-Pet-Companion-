// ============================================================
// NeuraClaw — GPU Tier Detection
// Probes WebGL capabilities to determine quality tier
// ============================================================

import type { GPUProfile, GPUTier, QualitySettings } from '@/types';

const TIER_PROFILES: Record<GPUTier, QualitySettings> = {
  high: {
    tier: 'high',
    enableBloom: true,
    enableSSAO: true,
    enableGodRays: true,
    enableFilmGrain: true,
    enableChromaticAberration: true,
    particleDensity: 1.0,
    shadowMapSize: 2048,
    enableShadows: true,
    terrainDetail: 1.0,
    enableReflections: true,
    targetFPS: 60,
  },
  medium: {
    tier: 'medium',
    enableBloom: true,
    enableSSAO: false,
    enableGodRays: true,
    enableFilmGrain: true,
    enableChromaticAberration: false,
    particleDensity: 0.6,
    shadowMapSize: 1024,
    enableShadows: true,
    terrainDetail: 0.7,
    enableReflections: false,
    targetFPS: 45,
  },
  low: {
    tier: 'low',
    enableBloom: true,
    enableSSAO: false,
    enableGodRays: false,
    enableFilmGrain: false,
    enableChromaticAberration: false,
    particleDensity: 0.3,
    shadowMapSize: 512,
    enableShadows: true,
    terrainDetail: 0.5,
    enableReflections: false,
    targetFPS: 30,
  },
  minimal: {
    tier: 'minimal',
    enableBloom: false,
    enableSSAO: false,
    enableGodRays: false,
    enableFilmGrain: false,
    enableChromaticAberration: false,
    particleDensity: 0.1,
    shadowMapSize: 256,
    enableShadows: false,
    terrainDetail: 0.3,
    enableReflections: false,
    targetFPS: 30,
  },
};

export function detectGPU(): GPUProfile | null {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return null;

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : 'unknown';

  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const supportsFloatTextures = !!gl.getExtension('OES_texture_float');
  const supportsInstancing = !!gl.getExtension('ANGLE_instanced_arrays');

  // Estimate VRAM from renderer string (rough heuristic)
  let estimatedVRAM = 512; // Default assumption
  const vramMatch = renderer.match(/(\d+)\s*GB/);
  if (vramMatch) {
    estimatedVRAM = parseInt(vramMatch[1]) * 1024;
  } else if (renderer.match(/RTX|RX\s*\d{3}/)) {
    estimatedVRAM = 4096;
  } else if (renderer.match(/GTX|RX/)) {
    estimatedVRAM = 2048;
  } else if (renderer.match(/Intel|UHD|HD\s*Graphics/)) {
    estimatedVRAM = 512;
  }

  // Determine tier
  let tier: GPUTier = 'low';
  const webglVersion = gl instanceof WebGL2RenderingContext ? 2 : 1;

  if (!webglVersion || estimatedVRAM < 256) {
    tier = 'minimal';
  } else if (estimatedVRAM >= 4096 && supportsFloatTextures && webglVersion === 2) {
    tier = 'high';
  } else if (estimatedVRAM >= 1024 && webglVersion === 2) {
    tier = 'medium';
  }

  return {
    tier,
    webglVersion,
    renderer,
    maxTextureSize,
    supportsFloatTextures,
    supportsInstancing,
    estimatedVRAM,
  };
}

export function getQualitySettings(profile: GPUProfile | null): QualitySettings {
  if (!profile) return TIER_PROFILES.minimal;
  return TIER_PROFILES[profile.tier];
}

export { TIER_PROFILES };
