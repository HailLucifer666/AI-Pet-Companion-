// ============================================================
// NeuraClaw — Pet Animation Library
// Procedural animation system: breath, gaze, expressions, gestures
// All values are normalized (0-1) and applied in the mesh
// ============================================================

// --- Easing functions for organic movement ---
export const ease = {
  smoothstep: (t: number) => t * t * (3 - 2 * t),
  smootherstep: (t: number) => t * t * t * (t * (t * 6 - 15) + 10),
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  breathe: (t: number) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5,
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

// --- Breath animation ---
export function getBreathPhase(time: number, rate = 1): number {
  return ease.breathe(time * rate);
}

export function getBreathScale(phase: number, intensity = 0.03): [number, number, number] {
  const yScale = 1 + phase * intensity;
  const xzScale = 1 - phase * (intensity * 0.3);
  return [xzScale, yScale, xzScale];
}

// --- Gaze / Look-at ---
export function getGazeAngles(
  from: [number, number, number],
  to: [number, number, number]
): { yaw: number; pitch: number } {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const dist = Math.sqrt(dx * dx + dz * dz);
  return {
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(dy, dist),
  };
}

// Smooth gaze with exponential decay (frame-rate independent)
export function smoothGaze(
  current: number,
  target: number,
  dt: number,
  speed = 4
): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

// --- Idle behaviors ---
export interface IdleBehavior {
  name: string;
  duration: number;
  weight: number;
}

export const IDLE_BEHAVIORS: IdleBehavior[] = [
  { name: 'look_around', duration: 3, weight: 0.3 },
  { name: 'head_bob', duration: 2, weight: 0.25 },
  { name: 'shift_weight', duration: 2.5, weight: 0.2 },
  { name: 'antenna_wiggle', duration: 1.5, weight: 0.15 },
  { name: 'glow_pulse', duration: 4, weight: 0.1 },
];

// Seeded RNG for deterministic but varied idle sequences
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// --- Hop animation ---
export interface HopKeyframe {
  time: number; // 0-1
  y: number;
  squash: number;
}

export function getHopPhase(time: number, speed = 1.5): number {
  const t = (time * speed) % 1;
  // Parabolic hop
  return Math.sin(t * Math.PI) * (t < 0.5 ? 1 : 0.8);
}

export function getHopSquash(time: number, speed = 1.5): number {
  const t = (time * speed) % 1;
  // Squash on land, stretch on jump
  if (t < 0.1) return 0.9 + t; // squash
  if (t > 0.9) return 0.9 + (1 - t); // squash
  return 1.05; // stretch
}

// --- Antenna animation ---
export function getAntennaWiggle(time: number, seed = 0): [number, number] {
  const rand = seededRandom(seed);
  const wobble1 = Math.sin(time * 3 + rand() * 10) * 0.15;
  const wobble2 = Math.sin(time * 2.5 + rand() * 20) * 0.1;
  return [wobble1, wobble2];
}

// --- Glow pulsing ---
export function getGlowIntensity(
  time: number,
  baseIntensity = 0.6,
  moodMultiplier = 1
): number {
  const pulse = Math.sin(time * 2) * 0.1 + Math.sin(time * 3.7) * 0.05;
  return (baseIntensity + pulse) * moodMultiplier;
}

// --- Arm poses per activity ---
export type ArmPose = 'idle' | 'wave' | 'point' | 'working' | 'celebrate' | 'sleep';

export function getArmPose(pose: ArmPose, time: number): {
  leftArm: [number, number, number];
  rightArm: [number, number, number];
} {
  const breathe = Math.sin(time * 2) * 0.05;
  switch (pose) {
    case 'wave':
      return {
        leftArm: [0, 0, 0],
        rightArm: [0, 0, Math.sin(time * 8) * 0.5 + 0.8],
      };
    case 'point':
      return {
        leftArm: [0, 0, breathe],
        rightArm: [0, -0.3, 0.9],
      };
    case 'working':
      return {
        leftArm: [0.3, 0.2, 0.4 + breathe],
        rightArm: [-0.3, 0.2, 0.4 - breathe],
      };
    case 'celebrate':
      return {
        leftArm: [0, 0, Math.sin(time * 6) * 0.3 + 1.2],
        rightArm: [0, 0, Math.cos(time * 6) * 0.3 + 1.2],
      };
    case 'sleep':
      return {
        leftArm: [0.2, 0, -0.3],
        rightArm: [-0.2, 0, -0.3],
      };
    default:
      return {
        leftArm: [0, 0, breathe],
        rightArm: [0, 0, -breathe],
      };
  }
}

// --- Head nod ---
export function getHeadNod(time: number, intensity = 0.1): number {
  return Math.sin(time * 1.5) * intensity;
}

// --- Expression blend ---
export function getExpressionBlend(
  time: number,
  blinkInterval = 3,
  blinkDuration = 0.15
): number {
  const cycle = time % blinkInterval;
  if (cycle < blinkDuration) {
    return cycle < blinkDuration / 2
      ? cycle / (blinkDuration / 2) // close
      : 1 - (cycle - blinkDuration / 2) / (blinkDuration / 2); // open
  }
  return 1; // fully open
}

// --- Full animation state ---
export interface PetAnimationState {
  breathPhase: number;
  breathScale: [number, number, number];
  gazeYaw: number;
  gazePitch: number;
  headNod: number;
  hopY: number;
  hopSquash: number;
  antennaWiggle: [number, number];
  glowIntensity: number;
  armPose: { leftArm: [number, number, number]; rightArm: [number, number, number] };
  expressionBlend: number;
  shadowScale: number;
}

export function computeAnimationState(
  time: number,
  dt: number,
  targetGaze: [number, number, number],
  petPosition: [number, number, number],
  activity: string,
  moodMultiplier: number,
  seed = 42
): PetAnimationState {
  // Breath
  const breathPhase = getBreathPhase(time, 0.8);
  const breathScale = getBreathScale(breathPhase, 0.035);

  // Gaze
  const targetAngles = getGazeAngles(petPosition, targetGaze);
  const gazeYaw = smoothGaze(0, targetAngles.yaw, dt, 3);
  const gazePitch = smoothGaze(0, targetAngles.pitch, dt, 3);

  // Hop (only when moving)
  const isMoving = activity === 'wandering' || activity === 'following';
  const hopY = isMoving ? getHopPhase(time, 2) * 0.3 : 0;
  const hopSquash = isMoving ? getHopSquash(time, 2) : 1;

  // Antenna
  const antennaWiggle = getAntennaWiggle(time, seed);

  // Glow
  const glowIntensity = getGlowIntensity(time, 0.7, moodMultiplier);

  // Arms
  const poseMap: Record<string, ArmPose> = {
    idle: 'idle',
    wandering: 'idle',
    working: 'working',
    celebrating: 'celebrate',
    sleeping: 'sleep',
    following: 'wave',
  };
  const armPose = getArmPose(poseMap[activity] || 'idle', time);

  // Expression blink
  const expressionBlend = getExpressionBlend(time, 2.5 + Math.sin(seed) * 0.5, 0.12);

  // Shadow
  const shadowScale = 1 - hopY * 0.5;

  return {
    breathPhase,
    breathScale,
    gazeYaw,
    gazePitch,
    headNod: getHeadNod(time, 0.08),
    hopY,
    hopSquash,
    antennaWiggle,
    glowIntensity,
    armPose,
    expressionBlend,
    shadowScale,
  };
}
