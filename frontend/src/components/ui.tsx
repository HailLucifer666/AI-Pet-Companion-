/** NeuraClaw UI primitives. Every surface builds from these — no raw divs-with-classes soup. */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, X } from "lucide-react";
import * as RSelect from "@radix-ui/react-select";
import * as RDialog from "@radix-ui/react-dialog";
import * as RPopover from "@radix-ui/react-popover";
import * as RTooltip from "@radix-ui/react-tooltip";
import * as RToast from "@radix-ui/react-toast";
import { create } from "zustand";

export function cx(...parts: Array<string | false | undefined>) {
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
        "inline-flex items-center gap-2 rounded-ctl px-3.5 py-2 text-sm",
        "transition-[transform,background-color,box-shadow] duration-150 ease-out-expo active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-claw-500 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100",
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
      className={cx(
        "inline-flex size-9 items-center justify-center rounded-ctl text-ink-300",
        "transition-[transform,background-color,color] duration-150 ease-out-expo active:scale-[0.92]",
        "hover:bg-ink-800 hover:text-ink-100",
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
  "placeholder:text-ink-500 transition-colors duration-150 focus:border-claw-600 focus:outline-none";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, "resize-none", className)} {...props} />;
}

/* ── Select (Radix, fully styled — no native control) ────────────── */

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <RSelect.Root value={value} onValueChange={onValueChange}>
      <RSelect.Trigger
        aria-label={ariaLabel}
        className={cx(
          "inline-flex h-9 items-center justify-between gap-2 rounded-ctl border border-ink-700 bg-ink-900 px-3 text-sm text-ink-300",
          "transition-colors duration-150 hover:border-ink-500",
          "focus-visible:outline-2 focus-visible:outline-claw-500 data-[state=open]:border-claw-600",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <RSelect.Value placeholder={placeholder} />
        </span>
        <RSelect.Icon>
          <ChevronDown className="size-4 shrink-0 text-ink-500" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="surface-overlay z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-overlay p-1 data-[state=open]:animate-pop-in"
        >
          <RSelect.Viewport>
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className={cx(
                  "relative flex cursor-pointer select-none items-center rounded-ctl py-1.5 pl-7 pr-3 text-sm text-ink-300 outline-none",
                  "data-[highlighted]:bg-claw-600/15 data-[highlighted]:text-claw-300 data-[state=checked]:text-claw-400",
                )}
              >
                <RSelect.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5" />
                </RSelect.ItemIndicator>
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

/* ── Dialog (Radix, motion-on-open via CSS data-state) ───────────── */

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>}
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <RDialog.Content className="surface-overlay fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-overlay p-5 focus:outline-none data-[state=open]:animate-pop-in">
          <RDialog.Title className="font-display text-lg font-semibold text-ink-100">
            {title}
          </RDialog.Title>
          {description && (
            <RDialog.Description className="mt-1 text-sm text-ink-500">
              {description}
            </RDialog.Description>
          )}
          {children && <div className="mt-4 text-sm text-ink-300">{children}</div>}
          {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
          <RDialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-ctl text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
            >
              <X className="size-4" />
            </button>
          </RDialog.Close>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/* ── Popover (Radix) ─────────────────────────────────────────────── */

export function Popover({
  trigger,
  children,
  className,
  side = "bottom",
}: {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <RPopover.Root>
      <RPopover.Trigger asChild>{trigger}</RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content
          side={side}
          sideOffset={8}
          className={cx(
            "surface-overlay z-50 rounded-overlay p-3 text-sm text-ink-300 focus:outline-none data-[state=open]:animate-pop-in",
            className,
          )}
        >
          {children}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

/* ── Tooltip (Radix — Provider mounted once in main.tsx) ─────────── */

export function Tooltip({
  label,
  children,
  side = "right",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={8}
          className="surface-overlay z-50 rounded-ctl px-2 py-1 text-xs text-ink-100 data-[state=delayed-open]:animate-pop-in"
        >
          {label}
          <RTooltip.Arrow className="fill-ink-850" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/* ── Surfaces ────────────────────────────────────────────────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("surface-raised rounded-card p-4", className)}>{children}</div>;
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

/* ── Skeleton ────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("rounded-ctl bg-ink-850", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent, oklch(100% 0 0 / 7%), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s linear infinite",
      }}
    />
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
      <div className="surface-raised flex size-14 items-center justify-center rounded-card">
        <Icon className="size-6 text-claw-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-medium text-ink-100">{title}</h2>
      <p className="max-w-sm text-sm text-ink-500">{description}</p>
      {action}
    </div>
  );
}

/* ── Toasts (Radix Toast + zustand store, fire from anywhere) ────── */

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  action?: ToastAction;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => number;
  dismiss: (id: number) => void;
}

let _toastId = 0;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++_toastId;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Fire a toast from anywhere (not just React components). Returns its id. */
export function toast(t: {
  title: string;
  description?: string;
  action?: ToastAction;
  durationMs?: number;
}): number {
  return useToastStore.getState().push({ durationMs: t.durationMs ?? 5000, ...t });
}

export function dismissToast(id: number): void {
  useToastStore.getState().dismiss(id);
}

/** Mounted once at the app root. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <RToast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <RToast.Root
          key={t.id}
          duration={t.durationMs}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={cx(
            "surface-overlay flex items-center gap-3 rounded-overlay px-4 py-3 text-sm",
            "data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out",
            "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-toast-out",
          )}
        >
          <div className="min-w-0 flex-1">
            <RToast.Title className="font-medium text-ink-100">{t.title}</RToast.Title>
            {t.description && (
              <RToast.Description className="mt-0.5 truncate text-xs text-ink-500">
                {t.description}
              </RToast.Description>
            )}
          </div>
          {t.action && (
            <RToast.Action altText={t.action.label} asChild>
              <button
                className="shrink-0 rounded-ctl px-2 py-1 text-xs font-medium text-claw-400 transition-colors hover:bg-claw-600/15"
                onClick={t.action.onClick}
              >
                {t.action.label}
              </button>
            </RToast.Action>
          )}
          <RToast.Close
            aria-label="Dismiss"
            className="shrink-0 text-ink-500 transition-colors hover:text-ink-100"
          >
            <X className="size-4" />
          </RToast.Close>
        </RToast.Root>
      ))}
      <RToast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[92vw] flex-col gap-2 outline-none" />
    </RToast.Provider>
  );
}
