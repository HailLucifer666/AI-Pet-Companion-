// ============================================================
// NeuraClaw — Color Tokens & Palette
// Bioluminescent Dusk Theme
// ============================================================

// Core dusk palette — all colors derived from these
export const DUSK_TOKENS = {
  // Sky gradient stops
  skyDawn: '#7B5EA7',
  skyDay: '#4A90D9',
  skyDusk: '#2D1B69',
  skyNight: '#0A0514',

  // Ember glow — warm accents
  ember: '#FF6B35',
  emberSoft: '#FF8C42',
  emberDeep: '#CC4400',
  emberGlow: '#FFB088',

  // Cyan/indigo — tech/cool accents
  cyan: '#00D4AA',
  cyanSoft: '#4DE8C8',
  cyanGlow: '#80FFE0',
  indigo: '#4A0080',
  indigoSoft: '#6B2FA8',

  // Bioluminescent greens
  bioGreen: '#39FF14',
  bioGreenSoft: '#7CFF6B',
  bioGreenGlow: '#B8FFB0',

  // Magical pinks/purples
  magicPink: '#FF61D2',
  magicPurple: '#9D4EDD',
  magicLavender: '#C8B6FF',

  // Neutrals
  darkBase: '#0D0A1A',
  darkElevated: '#1A1333',
  paper: '#F0E6FF',
  stone: '#8A7E9E',
  wood: '#6B4F3A',

  // Functional
  sea: '#1A0E3D',
  seaDeep: '#0D061A',
  lava: '#FF4500',
} as const;

// Dynamic sky gradients per time of day
export const SKY_GRADIENTS: Record<string, string[]> = {
  dawn: ['#1A0E3D', '#7B5EA7', '#FFB088', '#FF8C42'],
  day:  ['#4A90D9', '#87CEEB', '#B8E6FF', '#E8F4FF'],
  dusk: ['#0D0A1A', '#2D1B69', '#9D4EDD', '#FF6B35'],
  night: ['#020105', '#0A0514', '#1A0E3D', '#2D1B69'],
};

// Fog colors per time + weather
export const FOG_COLORS: Record<string, Record<string, string>> = {
  dawn:  { clear: '#7B5EA7', cloudy: '#6B5E8A', rain: '#4A4070', fog: '#8A7E9E', storm: '#3A3060' },
  day:   { clear: '#87CEEB', cloudy: '#6B7B8A', rain: '#4A5A6A', fog: '#9EACB8', storm: '#3A4A5A' },
  dusk:  { clear: '#2D1B69', cloudy: '#1E1447', rain: '#140D2E', fog: '#4A4070', storm: '#0D0818' },
  night: { clear: '#0A0514', cloudy: '#0D0818', rain: '#080510', fog: '#1A1333', storm: '#050210' },
};

// Light temperatures (Kelvin) per time of day
export const LIGHT_TEMPERATURES = {
  dawn: 3200,
  day: 5600,
  dusk: 2700,
  night: 2000,
} as const;

// Bioluminescent accent colors for village elements
export const BIO_GLOWS = [
  DUSK_TOKENS.ember,
  DUSK_TOKENS.cyan,
  DUSK_TOKENS.bioGreen,
  DUSK_TOKENS.magicPink,
  DUSK_TOKENS.magicPurple,
  DUSK_TOKENS.emberSoft,
  DUSK_TOKENS.cyanSoft,
] as const;

// Convert hex to Three.js color
export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [0, 0, 0];
};

// Linear interpolation between two hex colors
export const lerpHex = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round((ar + (br - ar) * t) * 255);
  const g = Math.round((ag + (bg - ag) * t) * 255);
  const bl = Math.round((ab + (bb - ab) * t) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
};

// Get glow color by index (deterministic)
export const getGlowColor = (index: number): string =>
  BIO_GLOWS[index % BIO_GLOWS.length];

// Pet ember-indigo palette
export const PET_COLORS = {
  body: '#1A1333',
  bodyHighlight: '#2D1B69',
  accent: '#00D4AA',
  accentEmber: '#FF6B35',
  screen: '#0D0A1A',
  screenGlow: '#00D4AA',
  eye: '#80FFE0',
  joint: '#4A0080',
  antenna: '#FF6B35',
} as const;
