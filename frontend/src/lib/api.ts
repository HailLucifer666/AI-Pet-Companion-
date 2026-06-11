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
  created_at: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<Health>("/health"),
  models: () => get<{ roles: Record<string, string[]> }>("/models"),
  sessions: () => get<{ sessions: SessionSummary[] }>("/sessions"),
  sessionMessages: (id: string) =>
    get<{ messages: Message[] }>(`/sessions/${encodeURIComponent(id)}/messages`),
};

/** react-query key conventions — one place, every surface follows it. */
export const queryKeys = {
  health: ["health"] as const,
  models: ["models"] as const,
  sessions: ["sessions"] as const,
  sessionMessages: (id: string) => ["sessions", id, "messages"] as const,
};
