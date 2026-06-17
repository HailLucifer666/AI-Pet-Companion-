/** apiBase — where the backend (Python sidecar) actually lives.
 *
 *  In `npm run dev` this is "" so relative `/api/...` calls flow through Vite's
 *  dev proxy (vite.config.ts). In a packaged Tauri build the WebView origin is
 *  `http://tauri.localhost`, which has no `/api` route — so we must target the
 *  sidecar's real origin explicitly, or every backend call (chat, SSE, voice,
 *  screen-pointing) 404s. The sidecar binds 127.0.0.1:8090 (backend config.py).
 */
export const API_BASE = import.meta.env.DEV ? "" : "http://127.0.0.1:8090";

/** Prefix a relative `/api/...` path with the backend base. Leaves absolute
 *  (http...) URLs untouched so callers can pass either. */
export function apiUrl(path: string): string {
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}
