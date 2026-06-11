/** NeuraClaw UI primitives. Every surface builds from these — no raw divs-with-classes soup. */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ── Buttons ─────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-claw-600 text-ink-950 font-medium hover:bg-claw-500 active:bg-claw-400",
  ghost:
    "bg-transparent text-ink-300 hover:bg-ink-800 hover:text-ink-100 active:bg-ink-700",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        "inline-flex items-center gap-2 rounded-ctl px-3.5 py-2 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-claw-500 disabled:opacity-40 disabled:pointer-events-none",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-9 items-center justify-center rounded-ctl text-ink-300",
        "hover:bg-ink-800 hover:text-ink-100 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-claw-500",
        className,
      )}
      {...props}
    >
      <Icon className="size-4.5" strokeWidth={1.75} />
    </button>
  );
}

/* ── Inputs ──────────────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-ctl bg-ink-900 border border-ink-700 px-3 py-2 text-sm text-ink-100 " +
  "placeholder:text-ink-500 focus:border-claw-600 focus:outline-none transition-colors";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, "resize-none", className)} {...props} />;
}

/* ── Surfaces ────────────────────────────────────────────────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-card bg-ink-900 shadow-raise p-4", className)}>{children}</div>
  );
}

export function Divider() {
  return <hr className="border-ink-800" />;
}

/* ── Feedback ────────────────────────────────────────────────────── */

type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "danger";

const badgeStyles: Record<BadgeTone, string> = {
  neutral: "bg-ink-800 text-ink-300",
  accent: "bg-claw-600/15 text-claw-400",
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  danger: "bg-danger/15 text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badgeStyles[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-300">
      <span
        className={cx("size-2 rounded-full", ok ? "bg-ok" : "bg-danger animate-pulse")}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-ink-700 border-t-claw-500",
        className,
      )}
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 font-sans text-[11px] text-ink-300">
      {children}
    </kbd>
  );
}

/* ── Empty state ─────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-card bg-ink-900 shadow-raise">
        <Icon className="size-6 text-claw-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-medium text-ink-100">{title}</h2>
      <p className="max-w-sm text-sm text-ink-500">{description}</p>
      {action}
    </div>
  );
}
