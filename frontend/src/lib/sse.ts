/**
 * POST-based SSE stream reader.
 *
 * We can't use EventSource: it's GET-only and can't be aborted cleanly.
 * This reads a fetch ReadableStream and yields parsed `data:` JSON events,
 * tolerating events split across network chunks.
 */

export interface SSEOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export type SSEEvent = Record<string, unknown> & { type: string };

/** Incremental parser, exposed separately so it can be unit-tested hard. */
export class SSEParser {
  private buffer = "";

  /** Feed a raw text chunk; returns zero or more complete events. */
  push(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];
    // Events are separated by a blank line. Handle \n\n and \r\n\r\n.
    let sep: number;
    while ((sep = this.findSeparator()) !== -1) {
      const raw = this.buffer.slice(0, sep.valueOf());
      this.buffer = this.buffer.slice(sep + this.sepLen);
      const data = raw
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && typeof parsed.type === "string") {
          events.push(parsed as SSEEvent);
        }
      } catch {
        // Malformed event: skip rather than kill the stream.
      }
    }
    return events;
  }

  private sepLen = 2;

  private findSeparator(): number {
    const lf = this.buffer.indexOf("\n\n");
    const crlf = this.buffer.indexOf("\r\n\r\n");
    if (crlf !== -1 && (lf === -1 || crlf < lf)) {
      this.sepLen = 4;
      return crlf;
    }
    this.sepLen = 2;
    return lf;
  }
}

export async function* streamSSE(
  url: string,
  body: unknown,
  opts: SSEOptions = {},
): AsyncGenerator<SSEEvent> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...opts.headers },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`SSE request failed: ${res.status} ${res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of parser.push(decoder.decode(value, { stream: true }))) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
