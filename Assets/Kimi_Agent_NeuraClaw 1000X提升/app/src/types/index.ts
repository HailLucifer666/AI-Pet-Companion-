// ============================================================
// NeuraClaw — Core Type Definitions
// ============================================================

// --- GPU / Quality Tiers ---
export type GPUTier = 'high' | 'medium' | 'low' | 'minimal';

export interface GPUProfile {
  tier: GPUTier;
  webglVersion: number;
  renderer: string;
  maxTextureSize: number;
  supportsFloatTextures: boolean;
  supportsInstancing: boolean;
  estimatedVRAM: number; // MB
}

export interface QualitySettings {
  tier: GPUTier;
  enableBloom: boolean;
  enableSSAO: boolean;
  enableGodRays: boolean;
  enableFilmGrain: boolean;
  enableChromaticAberration: boolean;
  particleDensity: number; // 0-1
  shadowMapSize: number;
  enableShadows: boolean;
  terrainDetail: number;
  enableReflections: boolean;
  targetFPS: number;
}

// --- World / Environment ---
export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface EnvironmentState {
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  dayProgress: number; // 0-1 cycle
  transitionSpeed: number;
}

// --- Pet / Lumenform ---
export type PetMood = 'serene' | 'curious' | 'excited' | 'tired' | 'melancholy' | 'working' | 'celebrating';
export type PetActivity = 'idle' | 'wandering' | 'working' | 'sleeping' | 'celebrating' | 'following';

export interface EmotionalState {
  mood: PetMood;
  energy: number; // 0-1
  happiness: number; // 0-1
  curiosity: number; // 0-1
  stress: number; // 0-1
}

export interface PetState {
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  activity: PetActivity;
  emotionalState: EmotionalState;
  level: number;
  isMoving: boolean;
  facing: [number, number, number]; // look-at direction
  animationPhase: number;
}

// --- Expressions (Screen Face) ---
export type ExpressionType =
  | 'neutral' | 'happy' | 'curious' | 'surprised' | 'sleepy'
  | 'working' | 'loving' | 'sad' | 'excited' | 'blinking';

export interface FaceConfig {
  expression: ExpressionType;
  eyeOpenness: number; // 0-1
  pupilOffset: [number, number]; // x, y
  glowIntensity: number;
  color: string;
}

// --- Audio ---
export type AudioZone = 'plaza' | 'hollow' | 'workbench' | 'garden' | 'wilds';
export type SoundCategory = 'ambient' | 'sfx' | 'music' | 'weather' | 'ui';

export interface AudioState {
  masterVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  currentZone: AudioZone;
}

// --- Places / Navigation ---
export type PlaceId = 'plaza' | 'hollow' | 'workbench' | 'garden' | 'shrine';

export interface Place {
  id: PlaceId;
  name: string;
  position: [number, number, number];
  radius: number;
  color: string;
}

// --- Performance ---
export interface PerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  frameTime: number;
  drawCalls: number;
  triangleCount: number;
  qualityRung: number; // 0-3, adaptive
}
