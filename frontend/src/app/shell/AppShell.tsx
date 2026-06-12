import { NavLink, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Brain,
  Calendar,
  FileText,
  ListTodo,
  Mail,
  MessageSquare,
  Settings,
  StickyNote,
  Telescope,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, queryKeys } from "../../lib/api";
import { StatusDot, Tooltip } from "../../components/ui";

interface Surface {
  to: string;
  label: string;
  icon: LucideIcon;
}

const surfaces: Surface[] = [
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/research", label: "Research", icon: Telescope },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/email", label: "Email", icon: Mail },
  { to: "/memory", label: "Memory", icon: Brain },
  { to: "/skills", label: "Skills", icon: Wrench },
];

function RailLink({ to, label, icon: Icon }: Surface) {
  return (
    <Tooltip label={label} side="right">
      <NavLink
        to={to}
        className={({ isActive }) =>
          [
            "group relative flex size-11 items-center justify-center rounded-ctl",
            "transition-[transform,background-color,color] duration-150 ease-out-expo active:scale-90",
            isActive
              ? "bg-claw-600/15 text-claw-400"
              : "text-ink-500 hover:bg-ink-800 hover:text-ink-100",
          ].join(" ")
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 h-6 w-0.5 rounded-full bg-claw-500" aria-hidden />
            )}
            <Icon className="size-5" strokeWidth={1.75} />
          </>
        )}
      </NavLink>
    </Tooltip>
  );
}

function StatusStrip() {
  const { data, isError } = useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    refetchInterval: 5000,
    retry: false,
  });
  const ok = !isError && data?.status === "ok";
  return (
    <footer className="flex h-7 items-center gap-4 border-t border-ink-800 bg-ink-900 px-3">
      <StatusDot ok={ok} label={ok ? `backend v${data?.version}` : "backend offline"} />
      {ok && <span className="text-xs text-ink-500">sqlite-vec {data?.sqlite_vec}</span>}
    </footer>
  );
}

export function AppShell() {
  const location = useLocation();
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-16 flex-col items-center gap-1 border-r border-ink-800 bg-ink-900/80 py-3 backdrop-blur-sm">
          <div
            className="mb-3 flex size-10 items-center justify-center rounded-card bg-claw-600 font-display text-lg font-bold text-ink-950 glow-accent"
            title="NeuraClaw"
          >
            N
          </div>
          {surfaces.map((s) => (
            <RailLink key={s.to} {...s} />
          ))}
          <div className="flex-1" />
          {import.meta.env.DEV && (
            <RailLink to="/styleguide" label="Styleguide" icon={BookOpen} />
          )}
          <RailLink to="/settings" label="Settings" icon={Settings} />
        </nav>
        <main className="min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="h-full overflow-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <StatusStrip />
    </div>
  );
}
