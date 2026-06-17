/** Typed client for the FastAPI backend. All surfaces go through this. */
import { API_BASE } from "./apiBase";

export interface Health {
  status: string;
  version: string;
  sqlite_vec: string;
}

export interface SessionSummary {
  id: string;
  title: string | null;
  created_at: string;
  last_active_at: string;
}

export interface Message {
  id: number;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls_json?: string | null;
  created_at: string;
}

export type MemoryType = "identity" | "preference" | "project" | "event" | "fact";

export interface Memory {
  id: number;
  type: MemoryType;
  content: string;
  confidence: number;
  created_at: string;
}

/** An approved (active) self-drafted skill â€” one earned monument in the village. */
export interface Skill {
  id: number;
  name: string;
  description: string;
  risk: string;
  status: string;
  created_at: string;
}

/** The Living Memory Web: kept memories + similarity links (real embeddings). */
export interface MemoryGraphNode {
  id: number;
  type: MemoryType;
  confidence: number;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string | null;
}
export interface MemoryGraphEdge {
  a: number;
  b: number;
  sim: number; // cosine similarity 0..1
}
export interface MemoryGraph {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
}

export interface ProfileEntry {
  key: string;
  value: string;
  updated_at?: string;
}

export interface Note {
  id: number;
  title: string;
  content_md: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "done" | "blocked";
  due_date_iso: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_iso: string;
  end_iso: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  doc_type: "md" | "html" | "csv";
  created_at: string;
  updated_at: string;
}

export interface Settings {
  providers: Record<
    string,
    { base_url: string; key_env: string | null; key_present: boolean }
  >;
  roles: Record<string, string[]>;
  trust: { max_auto_risk: number };
}

/** One discoverable model. `ref` is the canonical "provider/model" string the
 *  chat sends back as an override; `id` is the provider-local id. */
export interface ModelInfo {
  id: string;
  ref: string;
}
export interface ProviderModels {
  reachable: boolean;
  models: ModelInfo[];
}
/** Live per-provider model discovery (real `GET /v1/models` results). */
export interface ModelsAvailable {
  providers: Record<string, ProviderModels>;
}

export interface Pet {
  id: number;
  name: string;
  user_name: string;
  voice: string;
  stage: 1 | 2 | 3 | 4;
  xp: number;
  mood: string;
  traits_json: string;
  hatched_at: string;
  last_seen_at: string;
}

/** Does the companion have a mind to think with? (local Ollama or a cloud key.) */
export interface Brain {
  ollama: boolean;
  cloud_keys: boolean;
}

export interface PetResponse {
  pet: Pet | null;
  brain: Brain;
}

export interface XpEvent {
  type: string;
  amount: number;
  ref: string | null;
  created_at: string;
}

/** The Den digest: the companion + recent light + what's grown â€” feeds the daily greeting. */
export interface DenDigest {
  pet: Pet | null;
  recent_xp: XpEvent[];
  memory_count: number;
  skill_count: number;
}

export type WeatherCategory = "clear" | "cloudy" | "overcast" | "fog" | "rain" | "snow" | "storm";

/** Real current weather for the Grove's sky (best-effort; `available:false` â†’ the
 *  sky falls back to clear + the real-clock day/night cycle). */
export interface Weather {
  available: boolean;
  category?: WeatherCategory;
  cloud_cover?: number; // 0..100
  is_day?: boolean;
  temp_c?: number;
  city?: string | null;
}

/** The vision brain: can the companion see a screen, and does doing so send it
 *  off-device? `remote:true` means a captured screen leaves this machine â€” the UI
 *  must warn before capture. (`GET /api/vision`, resolved from the `vision` role.) */
export interface Vision {
  available: boolean;
  remote: boolean;
  model: string | null;
  provider: string | null;
}

/** Spotify connection snapshot for the Settings card. Never carries tokens.
 *  `configured` = app credentials present in .env; `connected` = the user has
 *  authorized via OAuth; `premium` is required for playback control. */
export interface SpotifyStatus {
  connected: boolean;
  configured: boolean;
  premium?: boolean;
  display_name?: string | null;
  active_device?: string | null;
}

export interface HatchBody {
  creature_name: string;
  user_name: string;
  voice: string;
  focus: string;
  boundaries: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}

const get = <T,>(path: string) => request<T>("GET", path);

export const api = {
  health: () => get<Health>("/health"),
  models: () => get<{ roles: Record<string, string[]> }>("/models"),
  modelsAvailable: () => get<ModelsAvailable>("/models/available"),
  settings: () => get<Settings>("/settings"),
  setKeys: (keys: Record<string, string>) =>
    request<{ ok: boolean; set: string[]; brain: Brain }>("POST", "/settings/keys", { keys }),

  pet: () => get<PetResponse>("/pet"),
  vision: () => get<Vision>("/vision"),
  den: () => get<DenDigest>("/den"),
  hatch: (body: HatchBody) => request<{ pet: Pet }>("POST", "/hatch", body),

  weather: () => get<Weather>("/weather"),

  skills: () => get<{ skills: Skill[] }>("/skills"),

  spotifyStatus: () => get<SpotifyStatus>("/spotify/status"),
  spotifyDisconnect: () => request<{ ok: boolean }>("POST", "/spotify/disconnect"),

  sessions: () => get<{ sessions: SessionSummary[] }>("/sessions"),
  sessionMessages: (id: string) =>
    get<{ messages: Message[] }>(`/sessions/${encodeURIComponent(id)}/messages`),
  archiveSession: (id: string) =>
    request<{ ok: boolean }>("DELETE", `/sessions/${encodeURIComponent(id)}`),

  memory: (q = "", type = "") =>
    get<{ memories: Memory[] }>(
      `/memory?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`,
    ),
  memoryGraph: () => get<MemoryGraph>("/memory/graph"),
  createMemory: (body: { type: MemoryType; content: string }) =>
    request<{ id: number | null }>("POST", "/memory", body),
  updateMemory: (id: number, content: string) =>
    request<{ ok: boolean }>("PUT", `/memory/${id}`, { content }),
  deleteMemory: (id: number) => request<{ ok: boolean }>("DELETE", `/memory/${id}`),

  profile: () => get<{ profile: ProfileEntry[] }>("/profile"),
  setProfile: (entry: { key: string; value: string }) =>
    request<{ ok: boolean }>("PUT", "/profile", entry),

  notes: (q = "") => get<{ notes: Note[] }>(`/notes?q=${encodeURIComponent(q)}`),
  createNote: (body: { title: string; content_md: string }) =>
    request<{ id: number }>("POST", "/notes", body),
  updateNote: (id: number, body: { title: string; content_md: string }) =>
    request<{ ok: boolean }>("PUT", `/notes/${id}`, body),
  deleteNote: (id: number) => request<{ ok: boolean }>("DELETE", `/notes/${id}`),

  tasks: (q = "") => get<{ tasks: Task[] }>(`/tasks?q=${encodeURIComponent(q)}`),
  createTask: (body: Partial<Task>) => request<{ id: number }>("POST", "/tasks", body),
  updateTask: (id: number, body: Partial<Task>) => request<{ ok: boolean }>("PUT", `/tasks/${id}`, body),
  deleteTask: (id: number) => request<{ ok: boolean }>("DELETE", `/tasks/${id}`),

  events: (q = "") => get<{ events: CalendarEvent[] }>(`/events?q=${encodeURIComponent(q)}`),
  createEvent: (body: Partial<CalendarEvent>) => request<{ id: number }>("POST", "/events", body),
  updateEvent: (id: number, body: Partial<CalendarEvent>) => request<{ ok: boolean }>("PUT", `/events/${id}`, body),
  deleteEvent: (id: number) => request<{ ok: boolean }>("DELETE", `/events/${id}`),

  documents: (q = "") => get<{ documents: Document[] }>(`/documents?q=${encodeURIComponent(q)}`),
  createDocument: (body: Partial<Document>) => request<{ id: number }>("POST", "/documents", body),
  updateDocument: (id: number, body: Partial<Document>) => request<{ ok: boolean }>("PUT", `/documents/${id}`, body),
  deleteDocument: (id: number) => request<{ ok: boolean }>("DELETE", `/documents/${id}`),
};

/** react-query key conventions â€” one place, every surface follows it. */
export const queryKeys = {
  health: ["health"] as const,
  models: ["models"] as const,
  modelsAvailable: ["models", "available"] as const,
  settings: ["settings"] as const,
  pet: ["pet"] as const,
  vision: ["vision"] as const,
  den: ["den"] as const,
  weather: ["weather"] as const,
  skills: ["skills"] as const,
  spotify: ["spotify"] as const,
  sessions: ["sessions"] as const,
  sessionMessages: (id: string) => ["sessions", id, "messages"] as const,
  memory: (q: string, type: string) => ["memory", q, type] as const,
  memoryGraph: ["memory", "graph"] as const,
  profile: ["profile"] as const,
  notes: (q: string) => ["notes", q] as const,
  tasks: (q: string) => ["tasks", q] as const,
  events: (q: string) => ["events", q] as const,
  documents: (q: string) => ["documents", q] as const,
};
