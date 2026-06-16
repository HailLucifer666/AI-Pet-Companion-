/** The first-run ritual — the companion's birth.
 *
 * A full-screen void with a waiting egg. Five quiet questions shape who it is,
 * a brain-check makes sure it has a mind to think with, then it hatches for real
 * (POST /api/hatch creates the pet row, regenerates SOUL.md, seeds first memories).
 * Rendered by the root gate whenever no pet exists yet. The only flashy moment in
 * an otherwise instrument-like app — and the one screenshot the whole product is
 * judged on. Honors reduced-motion: the egg simply *is*, no breathing.
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, KeyRound, Sparkles } from "lucide-react";
import { api, queryKeys, type Brain, type HatchBody } from "../../lib/api";
import { Button, Input, Select, Spinner, Textarea, toast } from "../../components/ui";
import { Creature } from "../../components/creature/Creature";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { bloomFlash } from "../../world3d/bloomCinematic";
import { playBirthChime } from "../../world3d/quickeningSound";

// Lazy so three.js/r3f never enter the eager main bundle (HatchRitual is eagerly
// imported by App). The 3D backdrop streams in; the questions show immediately.
const QuickeningScene = lazy(() =>
  import("./QuickeningScene").then((m) => ({ default: m.QuickeningScene })),
);

const VOICES = [
  { value: "warm", label: "Warm — encouraging, never saccharine" },
  { value: "direct", label: "Direct — no filler, no flattery" },
  { value: "playful", label: "Playful — real humor, still clear" },
  { value: "formal", label: "Formal — precise and measured" },
];

type Phase = "intro" | "questions" | "brain" | "hatching" | "revealed";

interface Answers {
  creature_name: string;
  user_name: string;
  voice: string;
  focus: string;
  boundaries: string;
}

const EMPTY: Answers = {
  creature_name: "",
  user_name: "",
  voice: "warm",
  focus: "",
  boundaries: "",
};

/* ── The waiting egg ─────────────────────────────────────────────────── */

function Egg({ size, cracking }: { size: number; cracking?: boolean }) {
  const reduced = useReducedMotion();
  const breathe = reduced
    ? {}
    : { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] };
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="-50 -60 100 120"
      aria-hidden
      animate={breathe}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id="eggGlow" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="var(--color-claw-400)" />
          <stop offset="55%" stopColor="var(--color-claw-600)" />
          <stop offset="100%" stopColor="var(--color-claw-700)" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="46" ry="58" fill="var(--color-claw-500)" opacity="0.16"
        style={{ filter: "blur(8px)" }} />
      <path
        d="M0,-56 C28,-56 40,-16 40,12 C40,40 22,56 0,56 C-22,56 -40,40 -40,12 C-40,-16 -28,-56 0,-56 Z"
        fill="url(#eggGlow)"
      />
      {/* inner heartbeat light */}
      <motion.ellipse
        cx="0" cy="6" rx="13" ry="17" fill="var(--color-claw-300)"
        animate={reduced ? {} : { opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(2px)" }}
      />
      {cracking && (
        <path d="M0,-40 L8,-12 L-6,6 L10,30 L-2,52" fill="none"
          stroke="var(--color-ink-950)" strokeWidth="2.5" strokeLinejoin="round" opacity="0.85" />
      )}
    </motion.svg>
  );
}

/* ── Layout shell for the void ───────────────────────────────────────── */

function Void({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-950 px-6 text-center"
      style={{
        backgroundImage:
          "radial-gradient(60% 50% at 50% 38%, oklch(73% 0.18 72 / 10%) 0%, transparent 70%)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Dawn burst: the first light ─────────────────────────────────────────
 * A single warm radial veil that pops the instant the egg hatches (dawn breaks),
 * then falls off cubic-out (bloomFlash) — the screen-wide echo of the egg's burst
 * of light, in cinematic and plain modes alike. Reduced-motion: no flash. */
const DAWN_MS = 1600;

function DawnBurst({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [op, setOp] = useState(0);
  useEffect(() => {
    if (!active || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const f = bloomFlash(performance.now() - start, DAWN_MS);
      setOp(f * 0.6);
      if (f > 0.001) raf = requestAnimationFrame(tick);
      else setOp(0);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);

  if (op <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-40"
      style={{
        opacity: op,
        background:
          "radial-gradient(circle at 50% 50%, var(--color-claw-200), var(--color-claw-400) 40%, transparent 75%)",
      }}
    />
  );
}

/* ── Stage: the ritual's backdrop ────────────────────────────────────────
 * Plain Void by default. Under `cinematic` (WebGL present, no error yet) it sets
 * the same Void content over the in-world Quickening dawn scene, wrapped in an
 * ErrorBoundary so any 3D failure falls straight back to the Void — onboarding
 * can never get trapped on a blank screen. Either way the dawn burst veils the
 * screen at the hatch moment. */
function Stage({
  cinematic,
  phase,
  qi,
  onError,
  children,
}: {
  cinematic: boolean;
  phase: Phase;
  qi: number;
  onError: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const dawn = phase === "hatching" || phase === "revealed";
  if (!cinematic) {
    return (
      <Void>
        {children}
        <DawnBurst active={dawn} reduced={reduced} />
      </Void>
    );
  }
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-950 px-6 text-center">
      <ErrorBoundary onError={onError}>
        <Suspense fallback={null}>
          <QuickeningScene phase={phase} qi={qi} />
        </Suspense>
      </ErrorBoundary>
      <div className="relative z-10 flex flex-col items-center">{children}</div>
      <DawnBurst active={dawn} reduced={reduced} />
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */

export function HatchRitual({ brain, cinematicMode = false }: { brain: Brain; cinematicMode?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("intro");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [hasBrain, setHasBrain] = useState(brain.ollama || brain.cloud_keys);
  const [creatureName, setCreatureName] = useState("");
  const [cineFailed, setCineFailed] = useState(false); // a 3D panic → fall back to the plain Void
  const cinematic = cinematicMode && !cineFailed;
  const suggested = useSuggestedPrompts(answers, creatureName);

  const set = (k: keyof Answers, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  // The one-shot birth chime. Created lazily under the "Hatch" gesture so the
  // AudioContext is allowed to start; silent under reduced-motion; never throws
  // into the hatch (audio is a flourish, the birth must always proceed).
  const audioRef = useRef<AudioContext | null>(null);
  function fireChime() {
    if (reduced) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = audioRef.current ?? (audioRef.current = new Ctor());
      if (ctx.state === "suspended") void ctx.resume();
      playBirthChime(ctx);
    } catch {
      /* audio blocked/unsupported — ignore */
    }
  }

  async function doHatch() {
    setPhase("hatching");
    fireChime();
    const body: HatchBody = {
      creature_name: answers.creature_name.trim(),
      user_name: answers.user_name.trim(),
      voice: answers.voice,
      focus: answers.focus.trim(),
      boundaries: answers.boundaries.trim(),
    };
    try {
      const { pet } = await api.hatch(body);
      setCreatureName(pet.name);
      // brief beat so the crack reads, then reveal (skipped under reduced-motion)
      setTimeout(() => setPhase("revealed"), reduced ? 0 : 900);
    } catch (e) {
      toast({ title: "It couldn't hatch", description: (e as Error).message });
      setPhase("brain");
    }
  }

  function enterDen(prompt?: string) {
    // Pet now exists → invalidate so the root gate swaps the ritual for the app.
    queryClient.invalidateQueries({ queryKey: queryKeys.pet });
    navigate("/den", prompt ? { state: { prompt } } : undefined);
  }

  /* intro */
  if (phase === "intro") {
    return (
      <Stage cinematic={cinematic} phase={phase} qi={qi} onError={() => setCineFailed(true)}>
        {!cinematic && <Egg size={200} />}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-8 max-w-md"
        >
          <h1 className="font-display text-2xl font-bold text-ink-100">
            Something is waiting to wake.
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            A companion is about to hatch — yours alone, living on this machine. A
            few questions shape who it becomes. Nothing leaves your computer.
          </p>
          <Button className="mt-6" onClick={() => setPhase("questions")}>
            <Sparkles className="size-4" /> Begin
          </Button>
        </motion.div>
      </Stage>
    );
  }

  /* hatching + revealed */
  if (phase === "hatching" || phase === "revealed") {
    return (
      <Stage cinematic={cinematic} phase={phase} qi={qi} onError={() => setCineFailed(true)}>
        {phase === "hatching" ? (
          <>
            {!cinematic && <Egg size={200} cracking />}
            <div className="mt-8 flex items-center gap-2 text-sm text-ink-500">
              <Spinner /> Waking…
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-w-md flex-col items-center"
          >
            <Creature stage={1} state="celebrating" size={180} />
            <h1 className="mt-6 font-display text-2xl font-bold text-ink-100">
              {creatureName} is awake.
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              It already knows a little about you. Say something to begin its life.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2">
              {suggested.map((p) => (
                <button
                  key={p}
                  onClick={() => enterDen(p)}
                  className="rounded-ctl border border-ink-700 bg-ink-900 px-4 py-2.5 text-left text-sm text-ink-300 transition-colors hover:border-claw-600 hover:text-ink-100"
                >
                  {p}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-4" onClick={() => enterDen()}>
              Just take me in <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        )}
      </Stage>
    );
  }

  /* brain-check */
  if (phase === "brain") {
    return (
      <Stage cinematic={cinematic} phase={phase} qi={qi} onError={() => setCineFailed(true)}>
        {!cinematic && <Egg size={120} />}
        <BrainStep
          hasBrain={hasBrain}
          onConnected={() => setHasBrain(true)}
          onBack={() => setPhase("questions")}
          onContinue={doHatch}
        />
      </Stage>
    );
  }

  /* questions */
  const isLast = qi === 4;
  const canAdvance = qi !== 0 || answers.creature_name.trim().length > 0;
  return (
    <Stage cinematic={cinematic} phase={phase} qi={qi} onError={() => setCineFailed(true)}>
      {!cinematic && <Egg size={120} />}
      <motion.div
        key={qi}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 w-full max-w-md text-left"
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-claw-500">
          {qi + 1} of 5
        </p>
        <QuestionField qi={qi} answers={answers} set={set} onEnter={() => {
          if (canAdvance) isLast ? setPhase("brain") : setQi((i) => i + 1);
        }} />
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (qi === 0 ? setPhase("intro") : setQi((i) => i - 1))}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
          <Button
            disabled={!canAdvance}
            onClick={() => (isLast ? setPhase("brain") : setQi((i) => i + 1))}
          >
            {isLast ? "Almost there" : "Continue"} <ArrowRight className="size-4" />
          </Button>
        </div>
      </motion.div>
    </Stage>
  );
}

/* ── Question field (one per step) ───────────────────────────────────── */

function QuestionField({
  qi,
  answers,
  set,
  onEnter,
}: {
  qi: number;
  answers: Answers;
  set: (k: keyof Answers, v: string) => void;
  onEnter: () => void;
}) {
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      onEnter();
    }
  };
  switch (qi) {
    case 0:
      return (
        <Field label="What will you call it?">
          <Input autoFocus placeholder="A name…" maxLength={40} value={answers.creature_name}
            onChange={(e) => set("creature_name", e.target.value)} onKeyDown={onKey} />
        </Field>
      );
    case 1:
      return (
        <Field label="And what should it call you?">
          <Input autoFocus placeholder="Your name…" maxLength={40} value={answers.user_name}
            onChange={(e) => set("user_name", e.target.value)} onKeyDown={onKey} />
        </Field>
      );
    case 2:
      return (
        <Field label="How should it speak with you?">
          <Select ariaLabel="Voice" value={answers.voice} onValueChange={(v) => set("voice", v)}
            options={VOICES} className="w-full" />
        </Field>
      );
    case 3:
      return (
        <Field label="What do you spend your days on?">
          <Textarea autoFocus rows={3} maxLength={500}
            placeholder="Shipping a product, studying, writing — whatever it should help with."
            value={answers.focus} onChange={(e) => set("focus", e.target.value)} />
        </Field>
      );
    default:
      return (
        <Field label="Anything it should never do without asking?">
          <Textarea autoFocus rows={3} maxLength={500}
            placeholder="e.g. never send email or messages on my behalf."
            value={answers.boundaries} onChange={(e) => set("boundaries", e.target.value)} />
        </Field>
      );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-display text-lg text-ink-100">{label}</span>
      {children}
    </label>
  );
}

/* ── Brain-check step ────────────────────────────────────────────────── */

function BrainStep({
  hasBrain,
  onConnected,
  onBack,
  onContinue,
}: {
  hasBrain: boolean;
  onConnected: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { data: settings } = useQuery({ queryKey: queryKeys.settings, queryFn: api.settings });
  const envOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const p of Object.values(settings?.providers ?? {})) {
      if (p.key_env && !p.key_present && !seen.has(p.key_env)) {
        seen.add(p.key_env);
        opts.push({ value: p.key_env, label: p.key_env });
      }
    }
    return opts;
  }, [settings]);

  const [env, setEnv] = useState("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const envName = env || envOptions[0]?.value || "";

  async function saveKey() {
    if (!envName || !key.trim()) return;
    setSaving(true);
    try {
      const res = await api.setKeys({ [envName]: key.trim() });
      setKey("");
      if (res.brain.ollama || res.brain.cloud_keys) {
        onConnected();
        toast({ title: "A mind is connected." });
      }
    } catch (e) {
      toast({ title: "Couldn't save the key", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8 w-full max-w-md text-left"
    >
      {hasBrain ? (
        <div className="rounded-card border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ink-100">
          <span className="inline-flex items-center gap-2 font-medium text-ok">
            <Check className="size-4" /> A mind is ready.
          </span>
          <p className="mt-1 text-ink-500">
            It can think on a local model or a connected provider. You're set.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="block font-display text-lg text-ink-100">
              It needs a mind to think.
            </span>
            <p className="mt-1 text-sm text-ink-500">
              Run a local model (Ollama) or paste a provider API key. Keys are written
              to <code className="rounded bg-ink-850 px-1">.env</code> on this machine —
              never sent anywhere, never shown again.
            </p>
          </div>
          {envOptions.length > 0 && (
            <Select ariaLabel="Provider key" value={envName} onValueChange={setEnv}
              options={envOptions} className="w-full" />
          )}
          <div className="flex gap-2">
            <Input type="password" placeholder="Paste API key…" value={key}
              onChange={(e) => setKey(e.target.value)} autoComplete="off" />
            <Button onClick={saveKey} disabled={saving || !key.trim() || !envName}>
              {saving ? <Spinner /> : <KeyRound className="size-4" />} Save
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button onClick={onContinue} variant={hasBrain ? "primary" : "ghost"}>
          {hasBrain ? "Hatch" : "Hatch anyway"} <Sparkles className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ── Suggested first prompts — personal, derived from the answers ────── */

function useSuggestedPrompts(answers: Answers, name: string): string[] {
  return useMemo(() => {
    const focus = answers.focus.trim();
    return [
      `What can you help me with, ${name}?`,
      focus ? `Let's make progress on ${focus}.` : "Help me get organised today.",
      "Remember something important about me.",
    ];
  }, [answers.focus, name]);
}
