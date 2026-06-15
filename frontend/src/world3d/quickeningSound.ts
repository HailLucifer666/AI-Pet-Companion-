/** quickeningSound â€” the Quickening's one-shot birth chime. A soft rising major
 *  arpeggio that blooms into a chord at the moment of hatching. Synthesised live
 *  with Web Audio oscillators (no asset, no dependency, nothing committed), so it
 *  costs nothing and ships nowhere. The voice schedule is pure + unit-testable;
 *  the player is a thin impure wrapper around a real AudioContext.
 *
 *  Played once when the egg hatches â€” after the user has clicked "Hatch", so the
 *  AudioContext can start under a gesture (autoplay policy). Reduced-motion gets
 *  silence (the caller gates it); audio is a flourish and never blocks the hatch. */

export interface ChimeVoice {
  /** Frequency in Hz. */
  freq: number;
  /** Start offset from the chime's onset, in seconds. */
  delay: number;
}

export const CHIME_GAIN = 0.075; // gentle â€” a cue, not a fanfare
export const CHIME_ATTACK = 0.04; // seconds to peak
export const CHIME_RELEASE = 1.8; // seconds to fade to silence

/** A C-major swell (C5 Â· E5 Â· G5 Â· C6), each voice entering a beat after the last
 *  so it reads as a rising bloom rather than a single stab. */
export function birthChimeVoices(): ChimeVoice[] {
  return [
    { freq: 523.25, delay: 0 }, // C5
    { freq: 659.25, delay: 0.12 }, // E5
    { freq: 783.99, delay: 0.24 }, // G5
    { freq: 1046.5, delay: 0.4 }, // C6
  ];
}

/** Schedule the chime on a live AudioContext. Wrap each voice in its own gain
 *  envelope (attack â†’ exponential release) and route through a soft master gain. */
export function playBirthChime(ctx: AudioContext, gain = CHIME_GAIN): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = gain;
  master.connect(ctx.destination);

  for (const v of birthChimeVoices()) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = v.freq;

    const env = ctx.createGain();
    const t0 = now + v.delay;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(1, t0 + CHIME_ATTACK);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + CHIME_ATTACK + CHIME_RELEASE);

    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + CHIME_ATTACK + CHIME_RELEASE + 0.1);
  }
}
