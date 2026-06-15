// ============================================================
// NeuraClaw — World Store (Zustand)
// Central state: time, weather, pet, environment
// ============================================================

import { create } from 'zustand';
import type {
  TimeOfDay,
  WeatherType,
  EnvironmentState,
  PetState,
  EmotionalState,
  PetMood,
  PetActivity,
  Place,
  PlaceId,
} from '@/types';

// Place registry — single source of truth
export const PLACES: Record<PlaceId, Place> = {
  plaza:     { id: 'plaza',     name: 'Hearth Plaza',   position: [0, 0.5, 0],       radius: 8,  color: '#FF6B35' },
  hollow:    { id: 'hollow',    name: 'The Hollow',     position: [-22, 1.2, -12],   radius: 6,  color: '#FF8C42' },
  workbench: { id: 'workbench', name: 'The Workbench',  position: [20, 1.2, -8],     radius: 6,  color: '#00D4AA' },
  garden:    { id: 'garden',    name: 'Memory Garden',  position: [5, 1.2, 22],      radius: 7,  color: '#9D4EDD' },
  shrine:    { id: 'shrine',    name: 'Crystal Shrine', position: [-15, 1.2, 18],    radius: 5,  color: '#39FF14' },
};

interface WorldState {
  // Environment
  environment: EnvironmentState;
  places: Record<PlaceId, Place>;

  // Pet
  pet: PetState;

  // Interaction
  hoveredPlace: PlaceId | null;
  selectedPlace: PlaceId | null;
  isPaused: boolean;
  isLoaded: boolean;

  // Actions
  setTimeOfDay: (time: TimeOfDay) => void;
  setWeather: (weather: WeatherType) => void;
  setDayProgress: (progress: number) => void;
  updatePet: (partial: Partial<PetState>) => void;
  setPetEmotionalState: (emotionalState: EmotionalState) => void;
  setPetMood: (mood: PetMood) => void;
  setPetActivity: (activity: PetActivity) => void;
  setPetPosition: (position: [number, number, number]) => void;
  setPetTarget: (target: [number, number, number] | null) => void;
  setHoveredPlace: (place: PlaceId | null) => void;
  setSelectedPlace: (place: PlaceId | null) => void;
  setPaused: (paused: boolean) => void;
  setLoaded: (loaded: boolean) => void;
  cycleWeather: () => void;
  advanceTime: (delta: number) => void;
}

const DEFAULT_EMOTIONAL_STATE: EmotionalState = {
  mood: 'serene',
  energy: 0.8,
  happiness: 0.7,
  curiosity: 0.6,
  stress: 0.1,
};

export const useWorldStore = create<WorldState>((set, get) => ({
  environment: {
    timeOfDay: 'dusk',
    weather: 'clear',
    dayProgress: 0.7, // Start at dusk
    transitionSpeed: 0.05,
  },
  places: PLACES,
  pet: {
    position: [0, 0.5, 0],
    targetPosition: null,
    activity: 'idle',
    emotionalState: DEFAULT_EMOTIONAL_STATE,
    level: 1,
    isMoving: false,
    facing: [0, 0, 1],
    animationPhase: 0,
  },
  hoveredPlace: null,
  selectedPlace: null,
  isPaused: false,
  isLoaded: false,

  setTimeOfDay: (timeOfDay) =>
    set((s) => ({ environment: { ...s.environment, timeOfDay } })),

  setWeather: (weather) =>
    set((s) => ({ environment: { ...s.environment, weather } })),

  setDayProgress: (dayProgress) =>
    set((s) => ({ environment: { ...s.environment, dayProgress } })),

  updatePet: (partial) =>
    set((s) => ({ pet: { ...s.pet, ...partial } })),

  setPetEmotionalState: (emotionalState) =>
    set((s) => ({ pet: { ...s.pet, emotionalState } })),

  setPetMood: (mood) =>
    set((s) => ({
      pet: { ...s.pet, emotionalState: { ...s.pet.emotionalState, mood } },
    })),

  setPetActivity: (activity) =>
    set((s) => ({ pet: { ...s.pet, activity } })),

  setPetPosition: (position) =>
    set((s) => ({ pet: { ...s.pet, position } })),

  setPetTarget: (targetPosition) =>
    set((s) => ({ pet: { ...s.pet, targetPosition } })),

  setHoveredPlace: (hoveredPlace) => set({ hoveredPlace }),
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  setPaused: (isPaused) => set({ isPaused }),
  setLoaded: (isLoaded) => set({ isLoaded }),

  cycleWeather: () => {
    const weathers: WeatherType[] = ['clear', 'cloudy', 'rain', 'storm', 'fog'];
    const current = get().environment.weather;
    const next = weathers[(weathers.indexOf(current) + 1) % weathers.length];
    set((s) => ({ environment: { ...s.environment, weather: next } }));
  },

  advanceTime: (delta) => {
    set((s) => {
      const newProgress = (s.environment.dayProgress + delta) % 1;
      let timeOfDay: TimeOfDay = s.environment.timeOfDay;
      if (newProgress < 0.2) timeOfDay = 'dawn';
      else if (newProgress < 0.5) timeOfDay = 'day';
      else if (newProgress < 0.8) timeOfDay = 'dusk';
      else timeOfDay = 'night';
      return {
        environment: { ...s.environment, dayProgress: newProgress, timeOfDay },
      };
    });
  },
}));
