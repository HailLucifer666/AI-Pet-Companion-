import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronRight,
  Monitor,
  MessageSquare,
  Mic,
  Plus,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Wrench,
} from "lucide-react";
import { api, queryKeys, type SessionSummary } from "../../lib/api";
import { streamSSE } from "../../lib/sse";
import { useUndoableDelete } from "../../lib/useUndoableDelete";
import { useVoice } from "../../lib/useVoice";
import { useScreenCapture } from "../../lib/useScreenCapture";
import { useModelStore, modelOverride } from "../../state/useModelStore";
import { useSightStore } from "../../state/useSightStore";
import { ModelSelector } from "../../components/ModelSelector";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Select,
  Skeleton,
  Spinner,
  Textarea,
} from "../../components/ui";

/* ── Stream state ────────────────────────────────────────────────── */

interface ToolActivity {
  tool: string;
  detail: string;
  done: boolean;
  ok: boolean;
}

interface StreamState {
  text: string;
  tools: ToolActivity[];
  error: string | null;
  running: boolean;
}

const idleStream: StreamState = { text: "", tools: [], error: null, running: false };

/* ── Markdown body ───────────────────────────────────────────────── */

function Body({ text }: { text: string }) {
  return (
    <div className="prose-chat space-y-2 text-sm leading-relaxed [&_a]:text-claw-400 [&_code]:rounded [&_code]:bg-ink-850 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_pre]:overflow-auto [&_pre]:rounded-ctl [&_pre]:bg-ink-850 [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_table]:text-xs [&_th]:border [&_th]:border-ink-700 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-ink-700 [&_td]:px-2 [&_td]:py-1">
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}

function ToolRow({ activity }: { activity: ToolActivity }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-ctl border border-ink-800 bg-ink-900/60 text-xs">
      <button
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-ink-300 hover:text-ink-100"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <Wrench className="size-3.5 text-claw-500" />
        <span className="font-medium">{activity.tool}</span>
        {!activity.done ? (
          <Spinner className="size-3" />
        ) : (
          <Badge tone={activity.ok ? "ok" : "danger"}>{activity.ok ? "done" : "failed"}</Badge>
        )}
      </button>
      {open && (
        <pre className="overflow-auto border-t border-ink-800 px-2.5 py-2 text-[11px] text-ink-500">
          {activity.detail || "(no detail)"}
        </pre>
      )}
    </div>
  );
}

/* ── Message bubbles ─────────────────────────────────────────────── */

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[80%] rounded-card rounded-br-sm bg-claw-600/15 px-4 py-2.5 text-sm whitespace-pre-wrap">
      {text}
    </div>
  );
}

function AssistantBlock({
  text,
  tools,
  streaming,
}: {
  text: string;
  tools?: ToolActivity[];
  streaming?: boolean;
}) {
  return (
    <div className="max-w-[92%] space-y-2">
      {tools?.map((t, i) => <ToolRow key={i} activity={t} />)}
      {text && (
        <div>
          <Body text={text} />
          {streaming && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 rounded-[1px] bg-claw-500 align-middle animate-caret"
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Session sidebar ─────────────────────────────────────────────── */

function SessionList({
  activeId,
  onOpen,
}: {
  activeId?: string;
  onOpen: (id?: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.sessions, queryFn: api.sessions });

  const archive = useUndoableDelete<SessionSummary>({
    remove: (s) =>
      queryClient.setQueryData<{ sessions: SessionSummary[] }>(queryKeys.sessions, (old) =>
        old ? { sessions: old.sessions.filter((x) => x.id !== s.id) } : old,
      ),
    restore: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
    commit: async (s) => {
      await api.archiveSession(s.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
    message: () => "Session archived",
  });

  function onArchive(s: SessionSummary) {
    archive(s);
    if (s.id === activeId) onOpen();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900/40">
      <div className="flex items-center justify-between p-3">
        <h2 className="font-display text-sm font-medium text-ink-300">Sessions</h2>
        <IconButton icon={Plus} label="New session" onClick={() => onOpen()} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {isLoading ? (
          <div className="space-y-1.5 px-1 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          data?.sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }}
              className={[
                "group flex cursor-pointer items-center gap-2 rounded-ctl px-2.5 py-2 text-sm",
                "transition-colors duration-150",
                s.id === activeId
                  ? "bg-ink-800 text-ink-100"
                  : "text-ink-300 hover:bg-ink-850 hover:text-ink-100",
              ].join(" ")}
              onClick={() => onOpen(s.id)}
            >
              <span className="min-w-0 flex-1 truncate">{s.title || "Untitled"}</span>
              <button
                aria-label="Archive session"
                className="hidden text-ink-500 hover:text-danger group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(s);
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </motion.div>
          ))
        )}
        {!isLoading && data && data.sessions.length === 0 && (
          <p className="px-2.5 py-4 text-xs text-ink-500">No sessions yet.</p>
        )}
      </div>
    </aside>
  );
}

/* ── Main view ───────────────────────────────────────────────────── */

export function ChatView({ embedded = false }: { embedded?: boolean } = {}) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  // Embedded (in the Den's diegetic overlay) we keep the active session in local
  // state instead of the URL, so the world stays mounted behind the pane.
  const [localSession, setLocalSession] = useState<string | undefined>(undefined);
  const sessionId = embedded ? localSession : params.sessionId;
  const goToSession = (id?: string) =>
    embedded ? setLocalSession(id) : navigate(id ? `/chat/${id}` : "/chat");
  const [input, setInput] = useState("");
  const [role, setRole] = useState("primary");
  const selectedModel = useModelStore((s) => s.selectedModel);
  const [stream, setStream] = useState<StreamState>(idleStream);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  const voice = useVoice();
  const [muted, setMuted] = useState(false);
  const { supported: capSupported, capturing, captureFrame } = useScreenCapture();
  const { capturedImage: attachedImage, setCapturedImage: setAttachedImage } = useSightStore();

  // A suggested prompt handed over from the hatch ritual lands here once.
  useEffect(() => {
    if (prefilled.current) return;
    const prompt = (location.state as { prompt?: string } | null)?.prompt;
    if (prompt) {
      setInput(prompt);
      prefilled.current = true;
      window.history.replaceState({}, ""); // don't re-apply on back/refresh
    }
  }, [location.state]);

  const { data: models } = useQuery({ queryKey: queryKeys.models, queryFn: api.models });
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.sessionMessages(sessionId ?? ""),
    queryFn: () => api.sessionMessages(sessionId!),
    enabled: !!sessionId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history?.messages.length, stream.text, stream.tools.length]);

  async function send(explicitText?: string) {
    const message = (explicitText ?? input).trim();
    if (!message || stream.running) return;
    setInput("");
    setStream({ ...idleStream, running: true });
    voice.cancelSpeech();
    const controller = new AbortController();
    abortRef.current = controller;
    let newSessionId = sessionId;
    let acc = "";
    try {
      for await (const event of streamSSE(
        "/api/chat",
        { 
          message, 
          session_id: sessionId ?? null, 
          role, 
          model: modelOverride(selectedModel),
          image_b64: attachedImage || undefined 
        },
        { signal: controller.signal },
      )) {
        if (event.type === "session" && !sessionId) {
          newSessionId = event.session_id as string;
        } else if (event.type === "delta") {
          acc += (event.text as string);
          
          const pointRegex = /\[POINT:(\d+),(\d+):([^\]]+)\]/;
          const match = pointRegex.exec(acc);
          if (match) {
            const x = parseInt(match[1]);
            const y = parseInt(match[2]);
            const label = match[3];
            
            if ((window as any).__TAURI_INTERNALS__) {
              import("@tauri-apps/api/window").then(async ({ Window }) => {
                const pointerWin = await Window.getByLabel("pointer");
                pointerWin?.show();
              });
              import("@tauri-apps/api/event").then(({ emit }) => {
                emit("draw-pointer", { x, y, label });
              });
            }
            
            acc = acc.replace(match[0], "");
          }
          
          setStream((s) => ({ ...s, text: acc }));
        } else if (event.type === "tool_start") {
          setStream((s) => ({
            ...s,
            tools: [
              ...s.tools,
              { tool: event.tool as string, detail: event.detail as string, done: false, ok: true },
            ],
          }));
        } else if (event.type === "tool_end") {
          setStream((s) => ({
            ...s,
            tools: s.tools.map((t, i) =>
              i === s.tools.length - 1
                ? { ...t, detail: event.detail as string, done: true, ok: event.ok as boolean }
                : t,
            ),
          }));
        } else if (event.type === "error") {
          setStream((s) => ({ ...s, error: event.message as string }));
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setStream((s) => ({ ...s, error: (e as Error).message }));
      }
    } finally {
      abortRef.current = null;
      setStream((s) => ({ ...s, running: false }));
      setAttachedImage(null);
      
      const final = acc.trim();
      if (final && !muted) {
        voice.speak(final);
      }
      
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      if (newSessionId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.sessionMessages(newSessionId),
        });
        // Keep a surfaced error visible (the reply lives in reloaded history, but
        // a failed/errored turn — common for a pinned model with no failover —
        // persists nothing, so the error banner must survive the reset).
        setStream((s) => (s.error ? { ...idleStream, error: s.error } : idleStream));
        if (newSessionId !== sessionId) goToSession(newSessionId);
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
    voice.cancelSpeech();
  }

  const toggleMic = () => {
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
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (!m) voice.cancelSpeech();
      return !m;
    });
  };

  const handleCapture = async () => {
    const frame = await captureFrame();
    if (frame) {
      setAttachedImage(frame);
    }
  };

  useEffect(() => () => {
    abortRef.current?.abort();
    voice.cancelSpeech();
  }, [voice]);

  const visibleMessages =
    history?.messages.filter((m) => m.role === "user" || (m.role === "assistant" && m.content)) ??
    [];
  const roles = Object.keys(models?.roles ?? { primary: [] });

  return (
    <div className="flex h-full">
      <SessionList activeId={sessionId} onOpen={goToSession} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          {sessionId && historyLoading ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
              <Skeleton className="ml-auto h-14 w-1/2" />
              <Skeleton className="h-24 w-3/4" />
              <Skeleton className="ml-auto h-10 w-2/5" />
              <Skeleton className="h-16 w-2/3" />
            </div>
          ) : visibleMessages.length === 0 && !stream.running && !stream.text ? (
            <EmptyState
              icon={MessageSquare}
              title="Talk to NeuraClaw"
              description="It can search the web, manage files in its workspace, take notes and remember what matters."
            />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
              {visibleMessages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} text={m.content} />
                ) : (
                  <AssistantBlock key={m.id} text={m.content} />
                ),
              )}
              {(stream.text || stream.tools.length > 0) && (
                <AssistantBlock text={stream.text} tools={stream.tools} streaming={stream.running} />
              )}
              {stream.running && !stream.text && stream.tools.length === 0 && (
                <Spinner className="ml-1" />
              )}
              {stream.error && (
                <div className="rounded-ctl bg-danger/10 px-3 py-2 text-sm text-danger">
                  {stream.error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
        <div className="border-t border-ink-800 bg-ink-900/40 p-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {attachedImage && (
              <div className="relative self-start">
                <img src={attachedImage} alt="Screen capture" className="h-24 w-auto rounded-md border border-ink-800 object-cover" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-ink-800 p-1 text-ink-300 hover:bg-ink-700 hover:text-ink-100 shadow-sm"
                  aria-label="Remove image"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Select
                ariaLabel="Model role"
                value={role}
                onValueChange={setRole}
                options={roles.map((r) => ({ value: r, label: r }))}
                className="w-24 shrink-0"
              />
              <ModelSelector className="w-44 shrink-0" />
              <Textarea
                rows={Math.min(6, Math.max(1, input.split("\n").length))}
                placeholder={voice.listening ? "Listening…" : "Message… (Enter to send, Shift+Enter for newline)"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex items-center gap-1 shrink-0 mb-1 mr-1">
                {capSupported && (
                  <button
                    onClick={handleCapture}
                    disabled={capturing}
                    aria-label="Capture screen"
                    className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800/70 hover:text-ink-100 disabled:opacity-50"
                  >
                    {capturing ? <Spinner className="size-4" /> : <Monitor className="size-4" />}
                  </button>
                )}
                {voice.sttSupported && (
                <button
                  onClick={toggleMic}
                  aria-label={voice.listening ? "Stop listening" : "Speak"}
                  className={`rounded-lg p-2 transition-colors ${
                    voice.listening
                      ? "animate-pulse bg-claw-600/30 text-claw-300"
                      : "text-ink-400 hover:bg-ink-800/70 hover:text-ink-100"
                  }`}
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
              </div>
              {stream.running ? (
                <Button variant="danger" onClick={stop} aria-label="Stop generating">
                  <Square className="size-4" /> Stop
                </Button>
              ) : (
                <Button onClick={() => void send()} disabled={!input.trim() && !attachedImage}>
                  <Send className="size-4" /> Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
