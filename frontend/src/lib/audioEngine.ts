/**
 * audioEngine.ts — A pure, zero-dependency Web Audio API sound generator.
 * Generates ambient drones, weather effects (rain noise), and musical SFX
 * procedurally to ensure 100% local-first playback with 0 asset overhead.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  
  // Ambient oscillators & LFOs
  private droneOscs: OscillatorNode[] = [];
  private lfos: OscillatorNode[] = [];
  
  // Rain noise node
  private rainNode: AudioWorkletNode | ScriptProcessorNode | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.5;
  private initialized: boolean = false;

  constructor() {
    // Load preferences
    try {
      this.volume = parseFloat(localStorage.getItem("neuraclaw_volume") ?? "0.5");
      this.isMuted = localStorage.getItem("neuraclaw_muted") === "true";
    } catch (e) {
      console.warn("Could not read audio settings from localStorage:", e);
    }
  }

  /**
   * Initializes the AudioContext. Must be called in response to a user gesture.
   */
  public init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Ambient channel
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.15; // Soft background ambient level
      this.ambientGain.connect(this.masterGain);

      // Rain channel
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0; // Starts silent
      this.rainGain.connect(this.masterGain);

      this.startAmbientDrone();
      this.startRainSynth();
      
      this.initialized = true;
      console.log("Audio Engine initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize Audio Engine:", e);
    }
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.ambientGain) return;

    // Create a 3-note relaxing bioluminescent chord: C3 (130.81Hz), G3 (196.00Hz), C4 (261.63Hz)
    const pitches = [130.81, 196.00, 261.63];

    pitches.forEach((freq, idx) => {
      if (!this.ctx || !this.ambientGain) return;
      
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      // Use warm triangle/sine waves
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;

      // Slow volume modulation via LFO for dynamic organic texture
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.08 + idx * 0.03; // Ultra slow oscillation
      lfoGain.gain.value = 0.03; // Modulate gain by ±3%
      
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      
      gainNode.gain.value = 0.08; // Base volume for this pitch
      
      osc.connect(gainNode);
      gainNode.connect(this.ambientGain);
      
      osc.start(0);
      lfo.start(0);

      this.droneOscs.push(osc);
      this.lfos.push(lfo);
    });
  }

  private startRainSynth() {
    if (!this.ctx || !this.rainGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Fill the buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter white noise to sound like rain (lowpass + bandpass)
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 800; // Soft rain, no harsh high noise

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 400;
    bandpass.Q.value = 0.5;

    whiteNoise.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(this.rainGain);

    whiteNoise.start(0);
  }

  /**
   * Adjusts the rain noise volume dynamically based on weather categories
   */
  public updateWeather(weather: string) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.rainGain) return;

    const now = this.ctx.currentTime;
    let targetVolume = 0;

    if (weather === "rain") {
      targetVolume = 0.12; // Moderate rain
    } else if (weather === "storm") {
      targetVolume = 0.25; // Heavy storm
    }

    // Smoothly transition weather sound (crossfade/ramp)
    this.rainGain.gain.cancelScheduledValues(now);
    this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);
    this.rainGain.gain.linearRampToValueAtTime(targetVolume, now + 3);
  }

  public playClick() {
    this.ensureCtxRunning();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playMemoryFormed() {
    this.ensureCtxRunning();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    
    // Play a resonant glowing crystal chime (two frequencies tuned to perfect fifth)
    const freqs = [523.25, 783.99]; // C5 and G5
    
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + 1.2);

      gain.gain.setValueAtTime(idx === 0 ? 0.15 : 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.6);
    });
  }

  public playHatching() {
    this.ensureCtxRunning();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    // Ascending sweep simulating energy gathering
    osc.frequency.exponentialRampToValueAtTime(880, now + 1.8);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.9);
  }

  public playLevelUp() {
    this.ensureCtxRunning();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    
    // Happy major triad arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      
      const timeOffset = idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + timeOffset);

      gain.gain.setValueAtTime(0.12, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.45);
    });
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    try {
      localStorage.setItem("neuraclaw_volume", this.volume.toString());
    } catch {}
    
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx?.currentTime ?? 0);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem("neuraclaw_muted", this.isMuted ? "true" : "false");
    } catch {}

    if (this.masterGain) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx?.currentTime ?? 0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private ensureCtxRunning() {
    if (!this.initialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
