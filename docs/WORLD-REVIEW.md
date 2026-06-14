# World Review — live `/den` capture (2026-06-14)

> Headless capture of the running app (`http://127.0.0.1:8090/den`) at 1280×800 + 768×900, mouse moved to
> trigger the cursor-lure. Real state at capture: **pet stage 1, xp 20** (gate ≈20%), **7 memory-crystals**,
> **weather = storm, Kolkata, 84% cloud**, local time ≈ dawn. Renderer was **SwiftShader (software WebGL)** —
> see the caveat; the user's Brave (hardware GPU) will look cleaner. "1000X" log: everything worth improving.

## Verdict
- **Works:** ✅ canvas + WebGL2 context up, app loads, **real data drives the world** (crystals = real memories, rain = real storm, light = real clock). No JS/runtime errors (the only "error" was `networkidle` timing out — that's our always-open Synapse SSE stream, expected, not a bug).
- **Looks:** the bioluminescent **night/storm grade lands** — dim teal-black island, glowing cyan/green/violet crystals + mushrooms, falling rain, vignette frame, intact rail. The art direction is finally reading like "The Mycelium."
- **But:** three real defects drag it down (below). The "graphics bad" feeling now is mostly **over-bloom + the rain-columns + a too-small pet**, not the base grade.

## ⚠️ Capture caveat (software vs Brave)
SwiftShader has no MSAA, crude alpha sorting, and a harsher Bloom. So on the user's real GPU: rain is finer, bloom is softer, edges are smooth, fps is far higher. **Verify exact fidelity in Brave.** Findings below separate "real defect" from "likely software artifact."

---

## P0 — fix before anything else (these are what still reads as "bad graphics")

1. **Rain renders as fat vertical columns / light-shafts.** Heavy storm = **800** streaks (`Rain3D MAX`), all packed in a 16-unit radius **around the pet**, each a 0.7–0.98-unit box at opacity 0.4 with `depthWrite=false` → they stack into solid pale pillars (worst at center where the pet sits). *Real defect* (software exaggerates it, but it's wrong on GPU too).
   - Fix: cut heavy count (~800→~320), thinner+shorter streaks (length ~0.4, width stays), lower opacity (~0.25), and **widen the spawn radius** / bias *away* from dead-center so they don't pillar on the pet. Consider a faint blue `lineSegments` look instead of boxes.
2. **Over-bloom haze + central light-shaft.** Bloom `intensity 1.0 / threshold 0.55` + the pet's point-light + ACES is blowing the center into a washed violet column. *Partly software, partly real.*
   - Fix: Bloom intensity ~0.7, threshold ~0.7 (only the truly-emissive blooms, not mid-tones), radius ~0.6; drop the pet `pointLight` peak (work/celebrate intensities) so it stops forming a shaft; cap emissive `glowBoost` lower at night (boost ~1.2, not 1.7).
3. **The pet is tiny and lost in the glare.** At default zoom + the bloom wash, the Lumenform is a small dot with a label over it. The whole point is the companion.
   - Fix: bump base scale a touch, pull the autonomous camera **closer** at rest (idle distance ~12 not ~15), make the crystalline shell read (slightly higher shell opacity ~0.4 + a thin emissive rim), and make sure the pet out-glows nearby crystals.

## P1 — look / art direction
4. **Daytime never seen** (captured at dawn-storm). Must verify the *bright day* end on real GPU — risk that ACES dimmed it. Eyeball at a daytime clock; if dim, raise day `sunIntensity`/exposure.
5. **Crystals read as undifferentiated glowing dots.** Species shapes (gem/spire/monolith/grove/quartz) don't distinguish at distance; all just "glow." Add subtle per-species size/height variance + a faint ground-glow disc under each (the prototype's radial halo) so they feel planted.
6. **Water is flat/dark** under storm — the sea reads as a black void at the horizon. Add a faint fresnel/rim or a slightly lighter horizon band; the fog→bg dissolve is good but the near sea is lifeless.
7. **Mushrooms barely distinguishable from crystals.** They merge into the same glowing-dot soup. Give mushrooms a clearly different silhouette (cap + stem readable) and a calmer, steadier glow vs the crystals' sharper facets.
8. **Trees are flat dark pyramids** — fine at distance but lifeless up close; a touch of emissive moss / rim light at night would tie them into the bioluminescent world.
9. **No ground-fog / atmosphere depth** at the island base (the hero-bg has low drifting mist). A thin additive ground-fog plane would add the cave-grove depth cheaply.

## P1 — feel / interaction (not testable headless — verify in Brave)
10. **Cursor-follow** couldn't be confirmed from a screenshot (needs live pointer). Verify: pet trots to cursor, eases to stop, resumes life after ~2.5s, ignores cursor during a tool-run.
11. **Camera framing** at rest sits a bit far + high; the pet is small. Tune idle distance/polar angle so the companion is the hero.
12. **Place label legibility** — the white "The Hollow" pill is bright/plain against the dark world; restyle as a glassy ember chip (matches tokens) and only show on hover/focus to reduce clutter.

## P1/P2 — performance
13. **Light count is climbing:** Atmosphere (3) + rim (1) + pet (1) + 5 mushroom point-lights + Hollow fire (1) + storm lightning (1) = ~12 dynamic lights, several with shadows off but still per-fragment. On low-end/integrated GPUs this is the first fps cliff. Cap mushroom lights to 3, and/or gate them by a perf tier. (SwiftShader hid the cost; real low-end won't.)
14. **`frustumCulled={false}`** on Particles + Rain is correct (they track the camera) but means they're always drawn — fine, just noted.
15. **No FPS degrade ladder yet** (planned in the master spec, not built). Bloom + lights + rain should drop first on weak GPUs. Add a simple frame-time watchdog that disables Bloom → reduces rain → drops mushroom lights.
16. **dpr `[1,1.75]`** is reasonable; consider `[1,1.5]` to save fill-rate on hi-DPI.

## P2 — accessibility
17. **Reduced-motion** path exists (no chase, Postfx off, static) — verify it actually reads "static but alive," not "dead."
18. **Hint text** ("drag to move · scroll to zoom…") is low-contrast small grey on a busy dark canvas — bump contrast / add the `glow-soft` shadow, or move into a glass chip.
19. **Canvas has no `role`/aria** — a screen-reader sees nothing. Add `role="img"` + an `aria-label` describing the scene state ("Pet resting in the grove, storm, 7 memories").

## ✅ Real-data correctness (the binding gate — all holding)
- 7 crystals on screen = 7 `/api/memory` rows. ✅
- Rain + clouds + dim = real `/api/weather` storm. ✅
- Dawn light = real local clock. ✅
- Nothing faked. Gate intact.

---

## Ranked quick wins (do these → biggest jump in "looks good")
1. **Tame Bloom** (intensity 0.7 / threshold 0.7) — kills the haze + central shaft. *5 min.*
2. **Fix rain** (fewer, thinner, shorter, wider spawn, lower opacity) — removes the columns. *15 min.*
3. **Hero the pet** (bigger + camera closer at rest + readable shell) — the companion becomes the subject. *20 min.*
4. **Lower night glowBoost** (1.7→~1.25) — crystals/pet glow without nuking definition. *2 min.*
5. **Ground-glow discs under crystals + calmer mushroom glow** — plants the bioluminescence. *20 min.*
6. **Glass ember Place labels, hover-only** — declutters. *15 min.*
7. **Verify daytime brightness** on a day clock; raise if ACES dimmed it.

> Recommend a short **V-2-ART-polish** pass (items 1–4) before V-2e, since they're the difference between "renders" and "looks intentional" — and they're minutes of work.
