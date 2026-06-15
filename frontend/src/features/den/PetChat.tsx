/** PetChat â€” a glass chat bubble in the Grove's top-right (under the clock) for
 *  talking to the companion. It speaks to the REAL agent over the same
 *  `POST /api/chat` SSE stream the Chat surface uses, so a message here also
 *  drives the world (the pet walks to the bench, the fire flares, a crystal
 *  sprouts, XP ticks â€” all via the Synapse bus). The streamed reply renders in
 *  the panel AND over the pet's head in 3-D (worldStore.speech â†’ PetBubble).
 *  Voice is free + local: the mic transcribes speech to text, and the reply is
 *  spoken aloud (Web Speech, feature-detected). Nothing faked, nothing leaves
 *  the device beyond the existing chat call. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Eye, Mic, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { api, queryKeys } from "../../lib/api";
import { streamSSE } from "../../lib/sse";
import { useScreenCapture } from "../../lib/useScreenCapture";
import { speechSnippet, useVoice } from "../../lib/useVoice";
import { useWorldStore } from "../../state/worldStore";
import { useModelStore, modelOverride } from "../../state/useModelStore";
import { cx } from "../../components/ui";

const STAGE_NAMES = ["", "Hatchling", "Juvenile", "Adult", "Elder"]; // backend ladder.py canon
const MAX_TURNS = 8;
const MAX_CHARS = 2000;
const SPEECH_HOLD_MS = 6000; // how long the 3-D speech lingers after the reply finishes

interface Turn {
  id: number;
  role: "you" | "pet";
  text: string;
}
let turnId = 1;

export function PetChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [stream, setStream] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [shot, setShot] = useState<string | null>(null); // a captured screen, pending attach

  const sessionRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speechClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();
  const voice = useVoice();
  const capture = useScreenCapture();
  const vision = useQuery({ queryKey: queryKeys.vision, queryFn: api.vision });
  const canSee = capture.supported && vision.data?.available === true;
  const setSpeech = useWorldStore((s) => s.setSpeech);
  const working = useWorldStore((s) => s.lumen.mode === "work");
  const stage = useWorldStore((s) => s.stage);
  const pet = useQuery({ queryKey: queryKeys.pet, queryFn: api.pet });
  const name = pet.data?.pet?.name || "your companion";
  const stageName = STAGE_NAMES[stage] || "Companion";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, stream]);

  const clearSpeechSoon = useCallback(() => {
    if (speechClearRef.current) clearTimeout(speechClearRef.current);
    speechClearRef.current = setTimeout(() => setSpeech(""), SPEECH_HOLD_MS);
  }, [setSpeech]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if ((!message && !shot) || running) return;
      const image = shot; // attach the pending screen capture, if any
      const shown = message || "What's on my screen?";
      setShot(null);
      setInput("");
      setError(null);
      setTurns((t) =>
        [...t, { id: turnId++, role: "you" as const, text: image ? `ðŸ–¼ ${shown}` : shown }].slice(
          -MAX_TURNS,
        ),
      );
      setStream("");
      setRunning(true);
      voice.cancelSpeech();
      if (speechClearRef.current) clearTimeout(speechClearRef.current);

      const controller = new AbortController();
      abortRef.current = controller;
      // Read the shared model selection at send time (no dropdown in the bubble,
      // but a choice made in Chat/Settings applies here too).
      const model = modelOverride(useModelStore.getState().selectedModel);
      let acc = "";
      try {
        for await (const ev of streamSSE(
          "/api/chat",
          {
            message: shown,
            session_id: sessionRef.current,
            role: "primary",
            image_b64: image ?? undefined,
            model,
          },
          { signal: controller.signal },
        )) {
          if (ev.type === "session") {
            if (!sessionRef.current) sessionRef.current = String(ev.session_id);
          } else if (ev.type === "delta") {
            acc += String(ev.text ?? "");
            setStream(acc);
            setSpeech(speechSnippet(acc)); // the companion "speaks" as it streams
          } else if (ev.type === "error") {
            setError(String(ev.message ?? "Something went wrong."));
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        abortRef.current = null;
        setRunning(false);
        const final = acc.trim();
        if (final) {
          setTurns((t) => [...t, { id: turnId++, role: "pet" as const, text: final }].slice(-MAX_TURNS));
          if (!muted) voice.speak(final);
          setSpeech(speechSnippet(final));
          clearSpeechSoon();
        } else {
          setSpeech("");
        }
        setStream("");
        qc.invalidateQueries({ queryKey: queryKeys.sessions });
        if (sessionRef.current) {
          qc.invalidateQueries({ queryKey: queryKeys.sessionMessages(sessionRef.current) });
        }
      }
    },
    [running, shot, muted, voice, setSpeech, clearSpeechSoon, qc],
  );

  // Capture one frame of a user-picked screen â†’ hold it as the next message's
  // attachment. Gated on a real vision brain (canSee) so we never send a screen
  // to a model that can't see it.
  const showScreen = useCallback(async () => {
    const img = await capture.captureFrame();
    if (img) setShot(img);
  }, [capture]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // Voice in: interim transcript fills the box; a final phrase sends it (hands-free).
  const toggleMic = useCallback(() => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.startListening((text, final) => {
      setInput(text);
      if (final && text.trim()) {
        voice.stopListening();
        void send(text);
      }
    });
  }, [voice, send]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) voice.cancelSpeech(); // muting now â†’ cut any ongoing speech
      return !m;
    });
  }, [voice]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (speechClearRef.current) clearTimeout(speechClearRef.current);
    },
    [],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute right-5 top-[4.5rem] z-40 flex items-center gap-2 rounded-full border border-claw-500/40 bg-ink-950/70 px-3.5 py-2 font-display text-xs font-medium text-ink-200 shadow-lg shadow-ink-950/40 backdrop-blur-md transition-colors duration-150 hover:border-claw-400 hover:bg-claw-600/25 focus-visible:outline-2 focus-visible:outline-claw-400"
      >
        <span className={cx("size-2 rounded-full", working ? "animate-pulse bg-claw-400" : "bg-ok")} aria-hidden />
        <Bot className="size-4" strokeWidth={1.75} />
        Talk to {name}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-5 top-[4.5rem] z-40 flex w-[min(22rem,calc(100vw-2.5rem))] origin-top-right animate-[pop-in_180ms_ease-out] flex-col overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/85 shadow-2xl shadow-ink-950/60 backdrop-blur-xl">
      {/* Header â€” the companion's identity + live status */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-800/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cx("size-2 rounded-full", working ? "animate-pulse bg-claw-400" : "bg-ok")}
            aria-hidden
          />
          <span className="font-display text-sm font-semibold text-ink-100">{name}</span>
          <span className="rounded-full bg-ink-800/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-400">
            {stageName}
          </span>
          {working && <span className="text-[11px] text-claw-300/90">thinkingâ€¦</span>}
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-full p-1 text-ink-400 hover:bg-ink-800/70 hover:text-ink-100 focus-visible:outline-2 focus-visible:outline-claw-400"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="max-h-[38vh] min-h-[3rem] space-y-2 overflow-auto px-4 py-3">
        {turns.length === 0 && !stream && !error && (
          <p className="text-center text-xs leading-relaxed text-ink-500">
            Say hello â€” your words reach the agent, and the island answers.
          </p>
        )}
        {turns.map((t) => (
          <div
            key={t.id}
            className={cx(
              "max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] leading-snug",
              t.role === "you"
                ? "ml-auto bg-claw-600/20 text-ink-100"
                : "mr-auto bg-ink-800/70 text-ink-200",
            )}
          >
            {t.text}
          </div>
        ))}
        {stream && (
          <div className="mr-auto max-w-[85%] rounded-2xl bg-ink-800/70 px-3 py-1.5 text-[13px] leading-snug text-ink-200">
            {stream}
            <span
              aria-hidden
              className="ml-0.5 inline-block h-3.5 w-[3px] translate-y-0.5 rounded-[1px] bg-claw-500 align-middle animate-caret"
            />
          </div>
        )}
        {error && <p className="text-center text-xs text-danger">{error}</p>}
      </div>

      {/* Input */}
      <div className="border-t border-ink-800/70 px-3 py-2">
        {shot && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-ink-700/70 bg-ink-950/50 p-2">
            <img src={shot} alt="Captured screen" className="h-12 w-20 shrink-0 rounded object-cover" />
            <p
              className={cx(
                "min-w-0 flex-1 text-[11px] leading-snug",
                vision.data?.remote ? "font-medium text-claw-300" : "text-ink-400",
              )}
            >
              {vision.data?.remote
                ? `âš  Will be sent to ${vision.data?.model ?? "a remote model"} â€” this screenshot leaves your device.`
                : `Stays on your device (${vision.data?.model ?? "local model"}).`}
            </p>
            <button
              onClick={() => setShot(null)}
              aria-label="Remove screenshot"
              className="rounded p-0.5 text-ink-500 hover:bg-ink-800/70 hover:text-ink-200"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          placeholder={voice.listening ? "Listeningâ€¦" : "Ask, share, or just chatâ€¦"}
          className="max-h-28 w-full resize-none bg-transparent text-sm leading-relaxed text-ink-100 placeholder-ink-500 outline-none"
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {voice.sttSupported && (
              <button
                onClick={toggleMic}
                aria-label={voice.listening ? "Stop listening" : "Speak"}
                className={cx(
                  "rounded-lg p-2 transition-colors",
                  voice.listening
                    ? "animate-pulse bg-claw-600/30 text-claw-300"
                    : "text-ink-400 hover:bg-ink-800/70 hover:text-ink-100",
                )}
              >
                <Mic className="size-4" />
              </button>
            )}
            {voice.ttsSupported && (
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute the companion's voice" : "Mute the companion's voice"}
                className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800/70 hover:text-ink-100"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            )}
            {canSee && (
              <button
                onClick={() => void showScreen()}
                disabled={capture.capturing}
                aria-label="Show the companion your screen"
                title="Show your screen"
                className={cx(
                  "rounded-lg p-2 transition-colors disabled:opacity-50",
                  shot
                    ? "bg-claw-600/30 text-claw-300"
                    : "text-ink-400 hover:bg-ink-800/70 hover:text-ink-100",
                  capture.capturing && "animate-pulse",
                )}
              >
                <Eye className="size-4" />
              </button>
            )}
            <span className="ml-1 text-[10px] tabular-nums text-ink-600">
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          {running ? (
            <button
              onClick={stop}
              aria-label="Stop"
              className="rounded-lg bg-ink-800 p-2 text-ink-200 hover:bg-ink-700"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() && !shot}
              aria-label="Send"
              className="rounded-lg bg-claw-600 p-2 text-ink-950 transition-colors hover:bg-claw-500 disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
