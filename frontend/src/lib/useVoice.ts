/** useVoice — free, browser-native voice for the Den's pet chat.
 *
 *  STT: the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) turns
 *  speech into text that fills the message box. If unsupported (e.g. Tauri Webview),
 *  it falls back to `MediaRecorder` and POSTs to `/api/voice/transcribe`.
 *  TTS: `speechSynthesis` speaks the companion's reply aloud.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function speechSnippet(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const tail = t.slice(-max);
  const boundary = tail.search(/[.!?]\s/);
  const start = boundary >= 0 ? boundary + 2 : 0;
  return `… ${tail.slice(start)}`.trim();
}

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
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [listening, setListening] = useState(false);

  const w = typeof window !== "undefined" ? (window as SpeechWindow) : undefined;
  const hasNativeStt = !!(w && (w.SpeechRecognition || w.webkitSpeechRecognition));
  const ttsSupported = !!(w && "speechSynthesis" in w);
  // We can fallback to MediaRecorder if native is unsupported
  const sttSupported = hasNativeStt || !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const stopListening = useCallback(() => {
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
    }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop(); // will trigger dataavailable and send to backend
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(
    async (onText: (text: string, final: boolean) => void) => {
      if (!w) return;
      
      if (hasNativeStt) {
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
      } else {
        // Fallback: MediaRecorder -> /api/voice/transcribe
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecRef.current = mediaRecorder;
          
          const chunks: BlobPart[] = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          
          mediaRecorder.onstop = async () => {
            setListening(false);
            const blob = new Blob(chunks, { type: 'audio/webm' });
            if (blob.size > 0) {
              const formData = new FormData();
              formData.append("file", blob, "voice.webm");
              try {
                const res = await fetch("/api/voice/transcribe", {
                  method: "POST",
                  body: formData,
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.text) {
                    onText(data.text, true);
                  }
                } else {
                  console.error("Transcribe failed:", res.statusText);
                }
              } catch (e) {
                console.error("Transcribe request failed:", e);
              }
            }
          };
          
          mediaRecorder.start();
          setListening(true);
        } catch (e) {
          console.error("Microphone access denied or error:", e);
        }
      }
    },
    [w, hasNativeStt]
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
    [ttsSupported]
  );

  // Stop any speech / listening if the component unmounts mid-turn.
  useEffect(
    () => () => {
      recRef.current?.abort();
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
         mediaRecRef.current.stop();
      }
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (ttsSupported) window.speechSynthesis.cancel();
    },
    [ttsSupported]
  );

  return { sttSupported, ttsSupported, listening, startListening, stopListening, speak, cancelSpeech };
}
