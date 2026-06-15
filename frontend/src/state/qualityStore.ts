// ============================================================
// NeuraClaw — Quality Store (Zustand)
// GPU tier + adaptive FPS quality scaling
// ============================================================

import { create } from 'zustand';
import type { GPUTier, QualitySettings, PerformanceMetrics } from '@/types';
import { detectGPU, getQualitySettings } from '@/world3d/utils/gpuDetect';

interface QualityState {
  // GPU / Tier
  gpuProfile: ReturnType<typeof detectGPU>;
  quality: QualitySettings;
  userOverride: Partial<QualitySettings> | null;

  // Adaptive FPS
  fpsHistory: number[];
  adaptiveRung: number; // 0-3, lower = reduced quality
  isAdaptiveActive: boolean;

  // Performance
  metrics: PerformanceMetrics;

  // Actions
  initialize: () => void;
  setTier: (tier: GPUTier) => void;
  updateFPS: (fps: number) => void;
  setUserOverride: (override: Partial<QualitySettings> | null) => void;
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  resetToAuto: () => void;
}

const HISTORY_SIZE = 60;
const FPS_LADDER = [55, 45, 35, 25]; // Drop quality below these thresholds

export const useQualityStore = create<QualityState>((set, get) => ({
  gpuProfile: null,
  quality: getQualitySettings(null),
  userOverride: null,
  fpsHistory: [],
  adaptiveRung: 0,
  isAdaptiveActive: true,
  metrics: {
    currentFPS: 60,
    averageFPS: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangleCount: 0,
    qualityRung: 0,
  },

  initialize: () => {
    const profile = detectGPU();
    const settings = getQualitySettings(profile);
    set({ gpuProfile: profile, quality: settings });
  },

  setTier: (tier: GPUTier) => {
    const { userOverride } = get();
    const base = getQualitySettings({ tier: tier, webglVersion: 2, renderer: 'manual', maxTextureSize: 4096, supportsFloatTextures: true, supportsInstancing: true, estimatedVRAM: 4096 });
    set({ quality: { ...base, ...userOverride } });
  },

  updateFPS: (fps: number) => {
    const state = get();
    if (!state.isAdaptiveActive) return;

    const history = [...state.fpsHistory, fps].slice(-HISTORY_SIZE);
    const avgFPS = history.reduce((a, b) => a + b, 0) / history.length;

    // Hysteresis-based quality ladder
    let newRung = state.adaptiveRung;
    if (avgFPS < FPS_LADDER[Math.min(newRung + 1, 3)] && newRung < 3) {
      newRung++;
    } else if (newRung > 0 && avgFPS > FPS_LADDER[newRung - 1] + 5) {
      newRung--;
    }

    // Apply rung adjustments
    const baseQuality = state.quality;
    const densitySteps = [1.0, 0.6, 0.3, 0.1];
    const shadowSteps = [2048, 1024, 512, 0];

    set({
      fpsHistory: history,
      adaptiveRung: newRung,
      metrics: {
        ...state.metrics,
        currentFPS: fps,
        averageFPS: avgFPS,
        qualityRung: newRung,
      },
      quality: {
        ...baseQuality,
        particleDensity: densitySteps[newRung],
        shadowMapSize: shadowSteps[newRung],
        enableShadows: shadowSteps[newRung] > 0,
      },
    });
  },

  setUserOverride: (override) => {
    const { quality } = get();
    set({
      userOverride: override,
      quality: override ? { ...quality, ...override } : quality,
    });
  },

  updateMetrics: (metrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...metrics },
    })),

  resetToAuto: () => {
    const profile = get().gpuProfile;
    const settings = getQualitySettings(profile);
    set({ userOverride: null, quality: settings, isAdaptiveActive: true, adaptiveRung: 0 });
  },
}));
