// ============================================================
// NeuraClaw — Pet Face Expressions
// Data-driven screen face configurations
// ============================================================

import type { FaceConfig, ExpressionType } from '@/types';
import { PET_COLORS } from '@/world3d/utils/colors';

export const EXPRESSIONS: Record<ExpressionType, FaceConfig> = {
  neutral: {
    expression: 'neutral',
    eyeOpenness: 1,
    pupilOffset: [0, 0],
    glowIntensity: 0.6,
    color: PET_COLORS.eye,
  },
  happy: {
    expression: 'happy',
    eyeOpenness: 0.85,
    pupilOffset: [0, 0.05],
    glowIntensity: 0.9,
    color: '#80FFE0',
  },
  curious: {
    expression: 'curious',
    eyeOpenness: 1,
    pupilOffset: [0.15, 0],
    glowIntensity: 0.8,
    color: '#FFB088',
  },
  surprised: {
    expression: 'surprised',
    eyeOpenness: 1.2,
    pupilOffset: [0, 0],
    glowIntensity: 1.0,
    color: '#FFFFFF',
  },
  sleepy: {
    expression: 'sleepy',
    eyeOpenness: 0.2,
    pupilOffset: [0, 0.1],
    glowIntensity: 0.3,
    color: '#6B2FA8',
  },
  working: {
    expression: 'working',
    eyeOpenness: 0.7,
    pupilOffset: [0, 0],
    glowIntensity: 0.5,
    color: '#00D4AA',
  },
  loving: {
    expression: 'loving',
    eyeOpenness: 0.75,
    pupilOffset: [0, 0.08],
    glowIntensity: 0.85,
    color: '#FF61D2',
  },
  sad: {
    expression: 'sad',
    eyeOpenness: 0.6,
    pupilOffset: [0, -0.05],
    glowIntensity: 0.4,
    color: '#4A90D9',
  },
  excited: {
    expression: 'excited',
    eyeOpenness: 1.1,
    pupilOffset: [0, 0.05],
    glowIntensity: 1.0,
    color: '#FF6B35',
  },
  blinking: {
    expression: 'blinking',
    eyeOpenness: 0.05,
    pupilOffset: [0, 0],
    glowIntensity: 0.2,
    color: PET_COLORS.eye,
  },
};

// Mood-to-expression mapping
export const MOOD_EXPRESSIONS: Record<string, ExpressionType[]> = {
  serene: ['neutral', 'happy', 'blinking'],
  curious: ['curious', 'neutral', 'surprised'],
  excited: ['excited', 'happy', 'surprised'],
  tired: ['sleepy', 'neutral', 'sad'],
  melancholy: ['sad', 'sleepy', 'neutral'],
  working: ['working', 'neutral', 'curious'],
  celebrating: ['excited', 'happy', 'loving'],
};

export function getExpressionForMood(mood: string, variant = 0): FaceConfig {
  const types = MOOD_EXPRESSIONS[mood] || MOOD_EXPRESSIONS.serene;
  const type = types[variant % types.length];
  return EXPRESSIONS[type];
}

export function lerpExpression(a: FaceConfig, b: FaceConfig, t: number): FaceConfig {
  return {
    expression: t > 0.5 ? b.expression : a.expression,
    eyeOpenness: a.eyeOpenness + (b.eyeOpenness - a.eyeOpenness) * t,
    pupilOffset: [
      a.pupilOffset[0] + (b.pupilOffset[0] - a.pupilOffset[0]) * t,
      a.pupilOffset[1] + (b.pupilOffset[1] - a.pupilOffset[1]) * t,
    ],
    glowIntensity: a.glowIntensity + (b.glowIntensity - a.glowIntensity) * t,
    color: t > 0.5 ? b.color : a.color,
  };
}
