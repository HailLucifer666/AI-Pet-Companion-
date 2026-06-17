import { SSEParser, type SSEEvent } from "./sse";
import { apiUrl } from "./apiBase";

export function connectSynapse(handler: (event: SSEEvent) => void): () => void {
  let dead = false;
  let retryTimer: ReturnType<typeof setTimeout>;
  let abortController = new AbortController();
  let delay = 1000;
  const MAX_DELAY = 30000;

  async function connect() {
    if (dead) return;
    
    abortController = new AbortController();
    
    try {
      const res = await fetch(apiUrl("/api/events"), {
        signal: abortController.signal,
      });
      
      if (!res.ok || !res.body) {
        throw new Error(`synapse: connection failed: ${res.status}`);
      }

      // Reset backoff on successful connection
      delay = 1000;
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SSEParser();

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const event of parser.push(decoder.decode(value, { stream: true }))) {
            if (dead) break;
            handler(event);
          }
          if (dead) break;
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Expected disconnect
      }
      console.warn("synapse: disconnected, retrying in", delay, "ms", err);
    }

    if (!dead) {
      retryTimer = setTimeout(connect, delay);
      delay = Math.min(delay * 2, MAX_DELAY);
    }
  }

  connect();

  return () => {
    dead = true;
    clearTimeout(retryTimer);
    abortController.abort();
  };
}
