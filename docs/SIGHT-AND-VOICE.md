# V-4 â€” Sight & Voice: the Teaching Buddy (clicky-inspired)

> **Status:** PLANNED milestone â€” build deferred until after V-2 (reactive world) and V-3 (pet form).
> **Inspiration:** [farzaa/clicky](https://github.com/farzaa/clicky) (MIT) â€” an AI teacher that *sees your screen, talks
> to you, and points at things*. This doc re-grounds clicky's exact features for AI Pet Companion's platform + the
> real-data / local-first gate. The spec lives here; tracking in `ROADMAP.md` + the master plan.
> **Decisions (user):** full native desktop pointing Â· free Web Speech voice Â· plan now, build after V-2.

---

## What clicky is (the bar we're matching)
A native **macOS Swift** menu-bar app. Hotkey (Ctrl+Opt) â†’ captures the screen (ScreenCaptureKit) â†’ streams the
screenshot + your spoken question to the **Claude API** â†’ Claude answers and can emit `[POINT:x,y:label:screenN]`
tags â†’ a transparent overlay draws an **animated cursor that points at the real UI element** across monitors.
Voice in via **AssemblyAI** (STT), voice out via **ElevenLabs** (TTS). Secrets live in a Cloudflare Worker. MIT.

Its essence: **teach Â· learn Â· active Â· responsive** â€” a buddy beside your cursor that perceives what you see and
guides you through it.

## The platform gap (why "exact" needs translation)
AI Pet Companion is a **browser web app + Python (FastAPI) backend**, not a native macOS app. A browser tab **cannot**
capture the OS screen on a global hotkey, draw on the desktop, or read desktop coordinates. So matching clicky's
desktop pointing requires a **native shell**, and clicky's cloud voice stack conflicts with local-first. Every
feature below is re-grounded and given a reality verdict.

---

## Platform decision â€” wrap AI Pet Companion in a Tauri shell
- **Tauri** (Rust core, MIT/Apache, small, uses the system webview) â€” chosen over Electron (heavy, bundles
  Chromium). The existing React/Vite app loads inside Tauri's webview **unchanged**.
- The **plain web build still runs standalone** in a browser, in a **degraded mode**: in-app screenshot via
  `getDisplayMedia`, point on the captured image in a panel â€” **no** desktop overlay/pointing.
- Tauri grants the OS powers a browser lacks: **global hotkey**, **full-screen capture**, and a transparent,
  always-on-top, **click-through overlay window** for real-desktop pointing.

---

## Capability map (clicky â†’ AI Pet Companion) with verdicts

| clicky capability | AI Pet Companion realization | Verdict |
|---|---|---|
| Activate via global hotkey | Tauri `global-shortcut` (Ctrl+Alt). Browser mode: in-app button/focused hotkey. | âœ… REAL (shell) |
| See the screen | Tauri/Rust OS capture (Windows Graphics Capture / `scap`; macOS ScreenCaptureKit) â†’ PNG â†’ base64. Browser mode: `getDisplayMedia()` one frame â†’ `<canvas>` â†’ base64 (opt-in). | âœ… REAL Â· NEW from scratch |
| Teach from the screenshot | Send screenshot + question to a **vision brain**. Backend chat is **text-only today** â†’ add optional `image_b64` to `ChatRequest`, shape OpenAI **multimodal content arrays** (`[{type:text},{type:image_url}]`), add a `vision` role in `config.yaml`. Provider passthrough unchanged. `primary` = `claude-sonnet-4.6` is already vision-capable. | ðŸŸ¡ REAL-WITH-WORK |
| Point at the real desktop | Brain emits `[POINT:x,y:label:screenN]`; parse from the stream; transparent click-through Tauri window per monitor draws an **animated pet-cursor + label** at desktop coords. Browser mode: point on the captured screenshot in-app. | âœ… REAL **only via shell** |
| Voice **out** (TTS) | Browser `speechSynthesis` speaks the streaming reply in the pet's voice persona â€” works in a real browser **and** in WebView2. | âœ… REAL |
| Voice **in** (STT) | `webkitSpeechRecognition` in real Chrome/Edge; **but not reliable inside embedded webviews** â†’ native shell uses **local Whisper** (`faster-whisper`/`whisper.cpp`) in the Python backend (free, local, no keys). | ðŸŸ¡ REAL-WITH-CAVEAT |
| "Lives next to your cursor" | Native mode: mini pet avatar rides the overlay near the cursor. In `/den`: the Lumenform reacts (work mode + ðŸ”§ bubble) while it "looks at" your screen. | âœ… REAL (shell) |

---

## Rejected / constrained (the gate + local-first)
- âŒ **ElevenLabs + AssemblyAI** (clicky's cloud voice) â€” paid, cloud, breaks local-first. Web Speech (browser)
  + local Whisper (shell) are the free/local equivalents; quality is lower but the ethos holds.
- âš ï¸ **Privacy fork â€” must be surfaced in the UI.** A **hosted** vision brain means your screenshot **leaves the
  device** (â†’ OpenRouter/Anthropic). Rules, non-negotiable:
  - Capture is **opt-in and on-demand only** (hotkey/button) â€” never continuous/background.
  - Screenshots are **never persisted** unless the user explicitly saves one.
  - The UI **warns** whenever the active vision brain is remote.
  - For fully-local sight, recommend an **Ollama vision model** (llava / llama3.2-vision) as the `vision` role â€”
    the screen never leaves the machine.
- âœ… **Licensing:** Tauri (MIT/Apache), `scap`, `whisper.cpp`/`faster-whisper` â€” all permissive.

---

## Phasing (ship value before the heavy native work)
| Phase | Scope | Native? | Effort |
|---|---|---|---|
| **V-4a** | Multimodal teaching â€” `getDisplayMedia` one-frame capture + in-app screenshot panel; backend image plumbing + `vision` role; pet explains the screen by text. | No (browser) | **M** |
| **V-4b** | Voice â€” `speechSynthesis` TTS of the reply + push-to-talk STT (Web Speech); `useVoice` hook into `ChatView`. | No (browser) | **M** |
| **V-4c** | Tauri shell â€” wrap the app; global hotkey; OS screen capture; local Whisper STT fallback. | Yes | **L** |
| **V-4d** | Desktop pointing â€” `[POINT:x,y]` parsing + transparent multi-monitor click-through overlay drawing the animated pet-cursor. | Yes | **L** |

V-4a/b deliver the *teach + voice* loop with **zero native work**; V-4c/d add the *real-desktop pointing* that
makes it clicky.

---

## Files (when built â€” not now)
- **Backend:** `api/routes.py` (`ChatRequest.image_b64`), `core/context.py` + `core/agent.py` (multimodal content
  arrays), `config.yaml` (`vision` role), new `voice/whisper.py` (V-4c).
- **Frontend:** new `lib/useScreenCapture.ts`, `lib/useVoice.ts`, a Sight panel + `ChatView.tsx` wiring, optional
  global-hotkey handler. Standalone-web degraded path preserved.
- **Native:** new `src-tauri/` (Rust: capture, overlay window, global shortcut) for V-4c/d.

## Verification (feature, when built)
- **V-4a** â€” capture a window â†’ the pet names what's on screen via the vision brain (tsc + pytest green; assert the
  image actually reaches the model in the request payload).
- **V-4b** â€” speak a question, hear the spoken reply.
- **V-4c** â€” global hotkey captures the full screen inside the shell; Whisper transcribes locally (no network).
- **V-4d** â€” ask "where's the save button?" â†’ the animated cursor lands on it on the **real desktop**.
- The **"Silent Observer" test** (from the council synthesis): without reading any text, can you tell what the AI is
  doing just by watching? For V-4, can a bystander see the pet *look at your screen, think, and point*?
