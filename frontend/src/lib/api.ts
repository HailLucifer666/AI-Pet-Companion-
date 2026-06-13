/** Typed client for the FastAPI backend. All surfaces go through this. */

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

export interface Settings {
  providers: Record<
    string,
    { base_url: string; key_env: string | null; key_present: boolean }
  >;
  roles: Record<string, string[]>;
  trust: { max_auto_risk: number };
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
  const res = await fetch(`/api${path}`, {
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
  settings: () => get<Settings>("/settings"),
  setKeys: (keys: Record<string, string>) =>
    request<{ ok: boolean; set: string[]; brain: Brain }>("POST", "/settings/keys", { keys }),

  pet: () => get<PetResponse>("/pet"),
  hatch: (body: HatchBody) => request<{ pet: Pet }>("POST", "/hatch", body),

  sessions: () => get<{ sessions: SessionSummary[] }>("/sessions"),
  sessionMessages: (id: string) =>
    get<{ messages: Message[] }>(`/sessions/${encodeURIComponent(id)}/messages`),
  archiveSession: (id: string) =>
    request<{ ok: boolean }>("DELETE", `/sessions/${encodeURIComponent(id)}`),

  memory: (q = "", type = "") =>
    get<{ memories: Memory[] }>(
      `/memory?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`,
    ),
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
};

/** react-query key conventions — one place, every surface follows it. */
export const queryKeys = {
  health: ["health"] as const,
  models: ["models"] as const,
  settings: ["settings"] as const,
  pet: ["pet"] as const,
  sessions: ["sessions"] as const,
  sessionMessages: (id: string) => ["sessions", id, "messages"] as const,
  memory: (q: string, type: string) => ["memory", q, type] as const,
  profile: ["profile"] as const,
  notes: (q: string) => ["notes", q] as const,
};
