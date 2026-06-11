import { describe, expect, test } from "vitest";
import { SSEParser } from "./sse";

describe("SSEParser", () => {
  test("parses a complete event", () => {
    const p = new SSEParser();
    const events = p.push('data: {"type":"delta","text":"hi"}\n\n');
    expect(events).toEqual([{ type: "delta", text: "hi" }]);
  });

  test("handles an event split mid-token across chunks", () => {
    const p = new SSEParser();
    expect(p.push('data: {"type":"del')).toEqual([]);
    expect(p.push('ta","text":"hello"}\n')).toEqual([]);
    expect(p.push("\n")).toEqual([{ type: "delta", text: "hello" }]);
  });

  test("parses multiple events in one chunk", () => {
    const p = new SSEParser();
    const events = p.push(
      'data: {"type":"delta","text":"a"}\n\ndata: {"type":"done"}\n\n',
    );
    expect(events.map((e) => e.type)).toEqual(["delta", "done"]);
  });

  test("skips malformed JSON without killing the stream", () => {
    const p = new SSEParser();
    const events = p.push('data: {not json}\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: "done" }]);
  });

  test("handles CRLF separators", () => {
    const p = new SSEParser();
    const events = p.push('data: {"type":"done"}\r\n\r\n');
    expect(events).toEqual([{ type: "done" }]);
  });

  test("ignores comments and non-data lines", () => {
    const p = new SSEParser();
    const events = p.push(': keepalive\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: "done" }]);
  });

  test("preserves multiline data joined with newline", () => {
    const p = new SSEParser();
    const events = p.push('data: {"type":"delta",\ndata: "text":"x"}\n\n');
    expect(events).toEqual([{ type: "delta", text: "x" }]);
  });

  test("drops events without a type field", () => {
    const p = new SSEParser();
    expect(p.push('data: {"foo":1}\n\n')).toEqual([]);
  });
});
