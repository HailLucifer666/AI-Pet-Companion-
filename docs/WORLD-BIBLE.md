# AI Pet Companion â€” World Bible: THE MYCELIUM

**v1.0 Â· 2026-06-13** Â· Companion to [PRD.md](PRD.md) Â· Engineering: [ARCHITECTURE-WORLD.md](ARCHITECTURE-WORLD.md)

> The one rule that makes this defensible: **the world visualizes only real computation.** Every crystal is a real memory row. Every forge-spark is a real skill draft. Every pulse of light is a real Synapse event. No fake theater â€” a living dashboard wearing a game's skin.

---

## 1. Cosmology â€” The Mycelium
Your machine has a hidden ecology. Every thought, memory, and tool-run your companion has sends a **pulse of light down the Mycelium** â€” glowing ember filaments threading the world. Where light gathers, life grows.

- **The Mycelium IS the Synapse event bus, made visible.**
- **Light IS XP** â€” and light is conserved (XP is only ever earned from real work, never spent on affection).
- The pet is the **gardener of that light**. You are the **sky** it grows under.

## 2. One world, three altitudes
Not three skins â€” **one continuous world** the camera *expands* through as the pet grows. Old realms stay standing; your history remains visitable.

| Realm | Stage gate | Identity | Places â†’ real surfaces |
|---|---|---|---|
| **I. The Bioluminescent Grove** | Hatchling (0); expands at Juvenile (250) | Night-forest terrarium â€” the shipped brand, alive | The Hollowâ†’Chat Â· Memory Gardenâ†’Memory Â· The Workbenchâ†’live tool runs Â· The Reading Rootâ†’Notes Â· **Spore Gate** (lockedâ†’II) |
| **II. The Digital Wilderness** | Adult (1000) | Data-nature: token rivers (current = `--activity`), light-trees (height = memory count), cyan = information / ember = life | Crystal Fieldsâ†’Memory Â· The Foundryâ†’Skills Â· The Confluenceâ†’Research Â· Archive Mesaâ†’Documents Â· Trail Markersâ†’Tasks/Calendar Â· **Ascent Gate** (lockedâ†’III) |
| **III. The Observatory** | Elder (3000) | Glass canopy above it all; the whole world below as a living map; aurora = XP velocity | The Orreryâ†’Calendar/jobs Â· The Long Viewâ†’Research/world-map Â· Hearthstoneâ†’Chat Â· Constellariumâ†’Memory-at-scale Â· Council Tableâ†’subagents |

Stage thresholds: **0 / 250 / 1000 / 3000** (Hatchling / Juvenile / Adult / Elder).

## 3. The pet â€” a **Lumenform**
Species: *Lumenform*. Yours is **"a Claw,"** named at hatch. A colony of layered light-strokes that **densifies** each stage (same organism, more light â€” this justifies evolution and gives a clean reduced-motion static form: just fewer strokes, still legible).

**Idle life (when you're not working it):** wanders, tends crystals, naps by the Hollow fire, chases fireflies, and **gazes up at the camera â€” at you.** None of this awards XP.

## 4. Real events â†’ the physical world (the core mapping)
Driven entirely by Synapse events (see [ARCHITECTURE-WORLD.md](ARCHITECTURE-WORLD.md)).

| Synapse event | In-world manifestation |
|---|---|
| `agent.thinking` | Pet sits, aura swells, thought-motes stream down the Mycelium |
| `agent.tool.start {tool}` | **Pet walks to the Workbench and works**; the tool's icon floats above it |
| `agent.tool.end {ok}` | Satisfied bob + spark (ok) / brief shake + smoke (fail) â€” **never guilt** |
| `agent.done` | Pet eases, pads home; `--activity` decays toward 0 |
| `memory.formed {memory_id, memory_type}` | A seed of light falls â†’ a crystal **sprouts** in the right bed â†’ the pet plants it |
| `memory.forgotten {memory_id}` | The crystal dims and folds back into the earth â€” calm, not death |
| `skill.drafted {name}` | Pet runs to the Foundry and **forges an artifact** (*The Forging*) |
| `xp.awarded {amount}` | Light-motes absorb into the pet; a thread runs to the nearest Gate, raising its fill |
| `pet.levelup` | **The Blooming** â€” aura flare, particle bloom, toast |
| `pet.stage` | **The Widening** â€” the Gate blooms open, the pet densifies, the camera reveals the new realm |

### Memory crystal species (by type)
Monolith (`identity`) Â· Ember-gem (`preference`) Â· Crystal-grove (`project`) Â· Spire (`event`) Â· Quartz (`fact`). Each crystal's geometry is **deterministic from its `memory_id`** â€” the same memory always grows the same crystal (see ARCHITECTURE-WORLD Â§determinism).

## 5. Time & weather = diegetic telemetry (never random)
A glance at the sky tells you how hard you've worked together.
- **World clock = real local time.** The pet sleeps during your quiet hours.
- **Weather binds to real signals:** spark-rain = sustained activity Â· light-bloom = high memory-formation rate Â· aurora = XP velocity Â· fog = drowsy (3+ idle days â€” expressed as soft art only; **no decay, no guilt, ever**).

## 6. Interaction laws â€” "charm never blocks work"
Every interaction is **optional delight**; the productivity tool stays a serious tool.
- **Petting / playing award ZERO XP** â€” never a clicker game; growth stays earned.
- Click a Place â†’ enter its surface Â· pet/stroke â†’ purr-glow Â· double-click or Space â†’ call the pet over Â· drag a firefly â†’ fetch game Â· first open of the day â†’ greeting with a REAL "while you were away" digest (skippable, **no streaks, no punishment**).
- **Full keyboard parity** (Tab cycles Places, Enter enters, Esc exits, WASD pans, M = map) and screen-reader support â€” WCAG 2.2 AA.

## 7. Named cinematics
- **The Quickening** (hatch 2.0): the egg sits *in* the Grove; each of the 5 ritual answers lights a region; the final crack is first dawn â€” the world is born *with* the pet.
- **The Blooming** (level-up): aura flare + particle bloom + toast.
- **The Widening** (stage / realm reveal): the Gate blooms open, the pet densifies, the camera pulls back to reveal the next realm.
- **The Forging** (skill draft): the pet forges an artifact at the Foundry; approved skills later become placeable monuments there.

Every cinematic is **skippable** and has a **reduced-motion still** fallback.

## 8. What the world must never do
Award XP for affection Â· punish absence Â· decay the pet Â· nag Â· invent data the backend doesn't have Â· block the productivity surfaces (the rail is always the fast path) Â· use a color not from the design tokens.
