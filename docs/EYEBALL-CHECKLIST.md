# EYEBALL CHECKLIST â€” live visual / audio verification

> Why this exists: slices are verified headlessly (tsc Â· vitest Â· build budgets Â· SwiftShader
> smoke for 0 console errors). Headless **cannot** judge composition, timing, framing, colour,
> motion feel, or audio. This is the running list of what still needs **human eyes/ears**. We
> batch-walk it at the end: check âœ…, or note what to tweak. Add to it every slice.
>
> **How to run the Quickening:** it only fires first-run (no pet). Wipe `data/` (gitignored) for a
> fresh hatch, or run on a clean machine. Reduced-motion path: OS "reduce motion" on, re-hatch.

---

## W-6 Â· The Quickening (first-run hatch cinematic) â€” ALL UNVERIFIED VISUALLY

| âœ“ | Item | How to trigger | Pass criteria | Suspected tweak knobs |
|---|------|----------------|---------------|------------------------|
| [ ] | **3D egg composition** | fresh hatch, watch introâ†’questions | glowing ovoid reads as the hero in the dark grove, sits lower-front, **not** hidden behind the question card | `EGG_Y` / `EGG_Z`, sphere radius/scale in `QuickeningScene.tsx` |
| [ ] | **No double-egg** | cinematic mode (WebGL present) | only the 3D egg shows â€” the 2D SVG egg is gone (gated `!cinematic`) | `{!cinematic && <Eggâ€¦>}` gates in `HatchRitual.tsx` |
| [ ] | **Egg warms per question** | answer Q1â†’Q5 | egg brightens noticeably as questions land; brain-check = held bright | `eggEmissive()` values |
| [ ] | **Dawn burst-flash** | reach hatch | gold radial veil pops once, falls off smooth â€” present but **not** blinding/cheesy | `DAWN_MS`, the `f * 0.6` opacity, gradient stops (`HatchRitual.tsx` DawnBurst) |
| [ ] | **Emergence motes** | at hatch â†’ reveal | warm spark fountain erupts from the egg + rises; reads alive, not too sparse/dense, not laggy | `MOTE_COUNT`, `MOTE_LIFE`, `size`, dir/speed in `EmergenceMotes` |
| [ ] | **Camera dolly** | introâ†’questionsâ†’hatchâ†’reveal | smooth push-in toward egg, presses at hatch, eases back at dawn; **not** nauseating/jittery | `DOLLY` map, `qi` z-step, ease rate `-2.2`, `look` target |
| [ ] | **Per-region kindling** | answer each question | 5 ember cairns behind the egg, each **in frame**, burst+light as its question lands, all alight by dawn; not clipping trees/ground/off-screen | `regions` arc (angle Â±0.9, r 5.0, z âˆ’3.0), `REGION_FLASH`, intensities |
| [ ] | **Birth chime** | click "Hatch" (audio on) | soft rising chord once â€” gentle, not startling/loud; fires exactly once | `CHIME_GAIN`, voices/delays, `CHIME_RELEASE` in `quickeningSound.ts` |
| [ ] | **Reduced-motion path** | OS reduce-motion ON, re-hatch | static-but-alive: egg present, regions lit (no burst), **no** dolly/motes/flash/chime; still readable | reduced gates throughout |
| [ ] | **No-WebGL fallback** | block WebGL / no GPU | plain Void + 2D SVG egg cracking; questions/hatch/reveal all work; no blank screen | `Stage` `!cinematic` branch |
| [ ] | **Full sequence feel** | one clean run | the birth "lands" â€” does the whole arc (dollyâ†’kindleâ†’burstâ†’flashâ†’motesâ†’chimeâ†’reveal) feel like a moment or busy/cluttered? | overall pacing / which beats to dial back |

---

## V-4a Â· Sight (screen capture â†’ vision) â€” LIVE-ONLY (getDisplayMedia can't be headless-tested)

> **Restart the backend first** (`./.venv/Scripts/python.exe -m AI Pet Companion`) â€” the
> `/api/vision` endpoint + `image_b64` chat field only go live after a restart. Without
> it the ðŸ‘ button stays hidden (correct fallback). A vision-capable model must be
> configured + reachable (the `vision` role) for the button to appear at all.

| âœ“ | Item | How to trigger | Pass criteria | Notes |
|---|------|----------------|---------------|-------|
| [ ] | **ðŸ‘ button gating** | open PetChat (top-right "Talk toâ€¦") | the eye button shows only when a vision brain is available; hidden otherwise (no blind sends) | `canSee` = capture.supported && /api/vision.available |
| [ ] | **Screen capture** | click ðŸ‘ â†’ pick a screen/window | one frame captured, shows as a thumbnail above the input; OS share stops immediately (no lingering capture indicator) | `useScreenCapture` stops tracks after one frame |
| [ ] | **âš  PRIVACY â€” remote warning** | with a hosted vision model (e.g. Sonnet) | thumbnail shows an **amber** "âš  Will be sent to {model} â€” this screenshot leaves your device" | **must be accurate** â€” verify it only says "leaves device" for a remote model |
| [ ] | **PRIVACY â€” local reassurance** | with a local Ollama vision model | thumbnail says "Stays on your device ({model})" â€” and confirm the screen truly doesn't leave | flip `vision` role to ollama/llama3.2-vision |
| [ ] | **Vision reply** | send with a screenshot attached | the companion describes what's on screen; the island still reacts (petâ†’bench, fire, etc.) | image sent for that turn only, never persisted |
| [ ] | **Image not persisted** | after a vision turn, reopen Chat surface | the stored message is the text only â€” no base64 blob in history | backend strips image from persistence |
| [ ] | **Remove + image-only send** | capture, then click the âœ• on the thumbnail; also try sending with no text | âœ• clears the attachment; sending with only a screenshot works (defaults to "What's on my screen?") | |

---

## Carried live-tune flags (prior slices â€” re-confirm during the walk)

| âœ“ | Item | Pass criteria | Notes |
|---|------|---------------|-------|
| [ ] | **Village plaza + campfire** | cobble disc fully visible, warm campfire (not white triangle), well/crates read intentional | M-1/M-2 flat-pad fix |
| [ ] | **Sun & Moon visibility** | sun by day / moon by night, found by orbiting to its azimuth, right size | `celestial.ts` elevation clamp, `Sky3D` disc radius |
| [ ] | **World density / "scattered not crowded"** | trees/rocks/grass read scattered + clean at Ã—5 | counts in `Island.tsx` etc. |
| [ ] | **Night clarity** | night = clear glowing shapes, not mud | ambient/hemi floor, exposure |
| [ ] | **Follow / cursor-lure feel** | pet trots to cursor smoothly; camera frames it; free-roam toggle works | `lure.ts`, CameraRig |
| [ ] | **Memory threads off-island + Mind's Eye (M)** | no cyan arcs on the world; press-M graph clustered/glowing/labeled | PIVOT-2 / P-2b |
| [ ] | **Glass pet-chat + 3D speech** | type/speak â†’ reply streams in panel + over pet head + island reacts; TTS/mute | PIVOT P-3 |

---

_Update rule: every new visual/audio slice appends a row here with how to trigger + pass criteria + the knobs to tweak._
