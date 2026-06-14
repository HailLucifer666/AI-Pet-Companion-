/** useVoice — free, browser-native voice for the Den's pet chat.
 *
 *  STT: the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) turns
 *  speech into text that fills the message box. TTS: `speechSynthesis` speaks the
 *  companion's reply aloud. Both are feature-detected — unsupported browsers
 *  (some embedded webviews) simply hide the affordances and the glass chat still
 *  works by typing. No external services, no keys, nothing leaves the device.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Trim a streaming reply to a short line for the in-world 3-D speech bubble:
 *  the most recent ~`max` chars, starting at a sentence boundary so it reads as
 *  live speech rather than a mid-word fragment. Pure → unit-tested. */
export function speechSnippet(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const tail = t.slice(-max);
  const boundary = tail.search(/[.!?]\s/);
  const start = boundary >= 0 ? boundary + 2 : 0;
  return `… ${tail.slice(start)}`.trim();
}

/* ── Minimal Web Speech typings (not in the standard DOM lib) ────────── */

interface SpeechResultEvent {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechWindow extends Window {
  SpeechRecognition?: { new (): RecognitionLike };
  webkitSpeechRecognition?: { new (): RecognitionLike };
}

export interface VoiceApi {
  sttSupported: boolean;
  ttsSupported: boolean;
  listening: boolean;
  startListening: (onText: (text: string, final: boolean) => void) => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
}

export function useVoice(): VoiceApi {
  const recRef = useRef<RecognitionLike | null>(null);
  const [listening, setListening] = useState(false);

  const w = typeof window !== "undefined" ? (window as SpeechWindow) : undefined;
  const sttSupported = !!(w && (w.SpeechRecognition || w.webkitSpeechRecognition));
  const ttsSupported = !!(w && "speechSynthesis" in w);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(
    (onText: (text: string, final: boolean) => void) => {
      if (!w) return;
      const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!Ctor) return;
      const rec = new Ctor();
      rec.lang = navigator.language || "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e: SpeechResultEvent) => {
        let text = "";
        let final = false;
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
          if (e.results[i].isFinal) final = true;
        }
        onText(text, final);
      };
      const finish = () => {
        setListening(false);
        recRef.current = null;
      };
      rec.onend = finish;
      rec.onerror = finish;
      recRef.current = rec;
      setListening(true);
      rec.start();
    },
    [w],
  );

  const cancelSpeech = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string) => {
      const line = text.trim();
      if (!ttsSupported || !line) return;
      window.speechSynthesis.cancel(); // never let two replies overlap
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 1;
      u.pitch = 1.05; // a touch bright — the companion's voice
      window.speechSynthesis.speak(u);
    },
    [ttsSupported],
  );

  // Stop any speech / listening if the component unmounts mid-turn.
  useEffect(
    () => () => {
      recRef.current?.abort();
      if (ttsSupported) window.speechSynthesis.cancel();
    },
    [ttsSupported],
  );

  return { sttSupported, ttsSupported, listening, startListening, stopListening, speak, cancelSpeech };
}
