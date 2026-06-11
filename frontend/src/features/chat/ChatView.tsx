import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Plus,
  Send,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import { api, queryKeys } from "../../lib/api";
import { streamSSE } from "../../lib/sse";
import { Badge, Button, EmptyState, IconButton, Spinner, Textarea } from "../../components/ui";

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

function AssistantBlock({ text, tools }: { text: string; tools?: ToolActivity[] }) {
  return (
    <div className="max-w-[92%] space-y-2">
      {tools?.map((t, i) => <ToolRow key={i} activity={t} />)}
      {text && <Body text={text} />}
    </div>
  );
}

/* ── Session sidebar ─────────────────────────────────────────────── */

function SessionList({ activeId }: { activeId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: queryKeys.sessions, queryFn: api.sessions });
  const archive = useMutation({
    mutationFn: api.archiveSession,
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      if (id === activeId) navigate("/chat");
    },
  });
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900/50">
      <div className="flex items-center justify-between p-3">
        <h2 className="font-display text-sm font-medium text-ink-300">Sessions</h2>
        <IconButton icon={Plus} label="New session" onClick={() => navigate("/chat")} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {data?.sessions.map((s) => (
          <div
            key={s.id}
            className={[
              "group flex cursor-pointer items-center gap-2 rounded-ctl px-2.5 py-2 text-sm",
              s.id === activeId
                ? "bg-ink-800 text-ink-100"
                : "text-ink-300 hover:bg-ink-850 hover:text-ink-100",
            ].join(" ")}
            onClick={() => navigate(`/chat/${s.id}`)}
          >
            <span className="min-w-0 flex-1 truncate">{s.title || "Untitled"}</span>
            <button
              aria-label="Archive session"
              className="hidden text-ink-500 hover:text-danger group-hover:block"
              onClick={(e) => {
                e.stopPropagation();
                archive.mutate(s.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {data && data.sessions.length === 0 && (
          <p className="px-2.5 py-4 text-xs text-ink-500">No sessions yet.</p>
        )}
      </div>
    </aside>
  );
}

/* ── Main view ───────────────────────────────────────────────────── */

export function ChatView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [role, setRole] = useState("primary");
  const [stream, setStream] = useState<StreamState>(idleStream);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: models } = useQuery({ queryKey: queryKeys.models, queryFn: api.models });
  const { data: history } = useQuery({
    queryKey: queryKeys.sessionMessages(sessionId ?? ""),
    queryFn: () => api.sessionMessages(sessionId!),
    enabled: !!sessionId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history?.messages.length, stream.text, stream.tools.length]);

  async function send() {
    const message = input.trim();
    if (!message || stream.running) return;
    setInput("");
    setStream({ ...idleStream, running: true });
    const controller = new AbortController();
    abortRef.current = controller;
    let newSessionId = sessionId;
    try {
      for await (const event of streamSSE(
        "/api/chat",
        { message, session_id: sessionId ?? null, role },
        { signal: controller.signal },
      )) {
        if (event.type === "session" && !sessionId) {
          newSessionId = event.session_id as string;
        } else if (event.type === "delta") {
          setStream((s) => ({ ...s, text: s.text + (event.text as string) }));
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
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      if (newSessionId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.sessionMessages(newSessionId),
        });
        setStream(idleStream);
        if (newSessionId !== sessionId) navigate(`/chat/${newSessionId}`);
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  const visibleMessages =
    history?.messages.filter((m) => m.role === "user" || (m.role === "assistant" && m.content)) ??
    [];
  const roles = Object.keys(models?.roles ?? { primary: [] });

  return (
    <div className="flex h-full">
      <SessionList activeId={sessionId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          {visibleMessages.length === 0 && !stream.running && !stream.text ? (
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
                <AssistantBlock text={stream.text} tools={stream.tools} />
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
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <select
              aria-label="Model role"
              className="h-9 rounded-ctl border border-ink-700 bg-ink-900 px-2 text-xs text-ink-300 focus:border-claw-600 focus:outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Textarea
              rows={Math.min(6, Math.max(1, input.split("\n").length))}
              placeholder="Message… (Enter to send, Shift+Enter for newline)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {stream.running ? (
              <Button variant="danger" onClick={stop} aria-label="Stop generating">
                <Square className="size-4" /> Stop
              </Button>
            ) : (
              <Button onClick={() => void send()} disabled={!input.trim()}>
                <Send className="size-4" /> Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
