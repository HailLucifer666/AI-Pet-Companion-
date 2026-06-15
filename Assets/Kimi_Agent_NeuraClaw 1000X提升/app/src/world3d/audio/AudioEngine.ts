// ============================================================
// NeuraClaw — Audio Engine (Howler.js)
// Procedural ambient soundscape + reactive SFX
// No external audio files — all synthesized via Web Audio API
// ============================================================

import { Howl } from 'howler';
import type { AudioZone } from '@/types';

// Simple noise buffer generation
function createNoiseBuffer(duration: number, type: 'white' | 'pink' | 'brown' = 'pink'): AudioBuffer {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'white') {
      data[i] = white * 0.1;
    } else if (type === 'pink') {
      const pink = (lastOut + (0.02 * white)) / 1.02;
      lastOut = pink;
      data[i] = pink * 0.15;
    } else {
      const brown = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brown;
      data[i] = brown * 0.2;
    }
  }
  return buffer;
}

// Synthesize ambient drone
function createDroneBuffer(frequency: number, harmonics: number[], duration: number): AudioBuffer {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    let sample = 0;
    const t = i / sampleRate;
    harmonics.forEach((h, idx) => {
      const amp = 1 / (idx + 1);
      sample += Math.sin(2 * Math.PI * frequency * h * t) * amp * 0.05;
    });
    // Envelope
    const env = Math.min(1, t * 2) * Math.min(1, (duration - t) * 2);
    data[i] = sample * env;
  }
  return buffer;
}

// Create a Howl from an AudioBuffer
function bufferToHowl(buffer: AudioBuffer, loop = true, volume = 0.5): Howl {
  // Convert AudioBuffer to WAV blob for Howler
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numChannels * 2, true);

  const dataOffset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(dataOffset + (i * numChannels + ch) * 2, sample * 0x7FFF, true);
    }
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  return new Howl({
    src: [url],
    format: ['wav'],
    loop,
    volume,
    autoplay: false,
  });
}

interface ZoneAmbience {
  drone: Howl;
  noise: Howl;
  volume: number;
}

class AudioEngine {
  private initialized = false;
  private masterVolume = 1;
  private muted = false;
  private currentZone: AudioZone = 'plaza';
  private ambience: Partial<Record<AudioZone, ZoneAmbience>> = {};
  private sfx: Record<string, Howl> = {};
  private weatherSounds: Partial<Record<string, Howl>> = {};

  // Initialize all procedural sounds
  initialize() {
    if (this.initialized) return;

    // Zone ambiences
    this.ambience.plaza = this.createZoneAmbience(110, [1, 2, 3, 5], 0.4, 'pink');
    this.ambience.hollow = this.createZoneAmbience(82, [1, 2, 4, 6], 0.5, 'brown');
    this.ambience.workbench = this.createZoneAmbience(130, [1, 1.5, 2, 3], 0.35, 'pink');
    this.ambience.garden = this.createZoneAmbience(98, [1, 2, 3, 4], 0.3, 'pink');
    this.ambience.wilds = this.createZoneAmbience(65, [1, 2, 3, 5], 0.5, 'brown');

    // Weather sounds
    const rainNoise = createNoiseBuffer(4, 'brown');
    this.weatherSounds.rain = bufferToHowl(rainNoise, true, 0.25);
    const stormNoise = createNoiseBuffer(4, 'brown');
    this.weatherSounds.storm = bufferToHowl(stormNoise, true, 0.4);
    const windNoise = createNoiseBuffer(4, 'pink');
    this.weatherSounds.wind = bufferToHowl(windNoise, true, 0.2);

    this.initialized = true;
    this.playZone('plaza');
  }

  private createZoneAmbience(
    baseFreq: number,
    harmonics: number[],
    volume: number,
    noiseType: 'pink' | 'brown'
  ): ZoneAmbience {
    const droneBuffer = createDroneBuffer(baseFreq, harmonics, 8);
    const noiseBuffer = createNoiseBuffer(4, noiseType);
    return {
      drone: bufferToHowl(droneBuffer, true, volume * 0.6),
      noise: bufferToHowl(noiseBuffer, true, volume * 0.4),
      volume,
    };
  }

  playZone(zone: AudioZone) {
    if (!this.initialized) return;
    if (this.currentZone === zone) return;

    // Fade out current
    const current = this.ambience[this.currentZone];
    if (current) {
      current.drone.fade(current.drone.volume(), 0, 2000);
      current.noise.fade(current.noise.volume(), 0, 2000);
      setTimeout(() => {
        current.drone.stop();
        current.noise.stop();
      }, 2000);
    }

    // Fade in new
    const next = this.ambience[zone];
    if (next) {
      next.drone.volume(0);
      next.noise.volume(0);
      next.drone.play();
      next.noise.play();
      next.drone.fade(0, next.volume * 0.6 * this.masterVolume, 3000);
      next.noise.fade(0, next.volume * 0.4 * this.masterVolume, 3000);
    }

    this.currentZone = zone;
  }

  setWeatherAudio(weather: string) {
    if (!this.initialized) return;

    // Stop all weather
    Object.values(this.weatherSounds).forEach((s) => {
      if (s?.playing()) {
        s.fade(s.volume(), 0, 2000);
        setTimeout(() => s.stop(), 2000);
      }
    });

    // Start appropriate weather sound
    const sound = this.weatherSounds[weather];
    if (sound) {
      sound.volume(0);
      sound.play();
      sound.fade(0, 0.3 * this.masterVolume, 3000);
    }
  }

  playSFX(name: string, volume = 0.5) {
    if (!this.initialized || this.muted) return;
    const sfx = this.sfx[name];
    if (sfx) {
      sfx.volume(volume * this.masterVolume);
      sfx.play();
    }
  }

  setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    Howler.volume(this.muted ? 0 : this.masterVolume);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.volume(muted ? 0 : this.masterVolume);
  }

  destroy() {
    Object.values(this.ambience).forEach((a) => {
      a?.drone.unload();
      a?.noise.unload();
    });
    Object.values(this.weatherSounds).forEach((s) => s?.unload());
    Object.values(this.sfx).forEach((s) => s.unload());
    this.initialized = false;
  }
}

export const audioEngine = new AudioEngine();
