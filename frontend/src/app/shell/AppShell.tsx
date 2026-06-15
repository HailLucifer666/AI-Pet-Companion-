import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Brain,
  Calendar,
  FileText,
  ListTodo,
  Mail,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sprout,
  StickyNote,
  Telescope,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, queryKeys } from "../../lib/api";
import { IconButton, StatusDot, Tooltip } from "../../components/ui";
import { Creature } from "../../components/creature/Creature";
import { useCreatureStore, connect, disconnectSynapse } from "../../state/creatureStore";
import { connect as connectWorld, disconnectWorld } from "../../state/worldStore";

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

const NAV_COLLAPSED_KEY = "AI Pet Companion-nav-collapsed";

function readNavCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

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
  const creatureStage = useCreatureStore((s) => s.stage);
  const creatureState = useCreatureStore((s) => s.state);
  const creatureReaction = useCreatureStore((s) => s.reaction);
  const reduceMotion = useReducedMotion();
  const [navCollapsed, setNavCollapsed] = useState(readNavCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, navCollapsed ? "1" : "0");
    } catch {
      /* localStorage unavailable (private mode) â€” collapse just won't persist */
    }
  }, [navCollapsed]);

  useEffect(() => {
    connect();
    connectWorld(); // keep the world's state live even when the Den is closed
    return () => {
      disconnectSynapse();
      disconnectWorld();
    };
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <div className="relative flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {!navCollapsed && (
            <motion.nav
              key="nav-rail"
              initial={{ width: 0 }}
              animate={{ width: 64 }}
              exit={{ width: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 overflow-hidden border-r border-ink-800 bg-ink-900/80 backdrop-blur-sm"
            >
              <div className="flex h-full w-16 flex-col items-center gap-1 py-3">
                <div
                  className="mb-3 flex size-10 items-center justify-center rounded-card bg-claw-600 font-display text-lg font-bold text-ink-950 glow-accent"
                  title="AI Pet Companion"
                >
                  N
                </div>
                {/* The Grove is home â€” the world the companion lives in (also the live
                    creature avatar at the rail's foot). */}
                <RailLink to="/den" label="The Grove" icon={Sprout} />
                <div className="my-1 h-px w-6 bg-ink-800" aria-hidden />
                {surfaces.map((s) => (
                  <RailLink key={s.to} {...s} />
                ))}
                <div className="flex-1" />

                <Tooltip label="Den" side="right">
                  <NavLink
                    to="/den"
                    className={({ isActive }) =>
                      [
                        "group relative flex size-11 items-center justify-center rounded-ctl",
                        "transition-colors duration-150 ease-out-expo active:scale-90",
                        isActive ? "bg-claw-600/15" : "hover:bg-ink-800",
                      ].join(" ")
                    }
                  >
                    <Creature stage={creatureStage} state={creatureState} reaction={creatureReaction} size={40} />
                  </NavLink>
                </Tooltip>

                {import.meta.env.DEV && (
                  <RailLink to="/styleguide" label="Styleguide" icon={BookOpen} />
                )}
                <RailLink to="/settings" label="Settings" icon={Settings} />
                <div className="my-1 h-px w-6 bg-ink-800" aria-hidden />
                <Tooltip label="Collapse sidebar" side="right">
                  <IconButton
                    icon={PanelLeftClose}
                    label="Collapse sidebar"
                    onClick={() => setNavCollapsed(true)}
                  />
                </Tooltip>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence>
            {navCollapsed && (
              <motion.div
                key="nav-reveal"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-2 top-2 z-20"
              >
                <Tooltip label="Expand sidebar" side="right">
                  <IconButton
                    icon={PanelLeft}
                    label="Expand sidebar"
                    className="surface-raised shadow-lg"
                    onClick={() => setNavCollapsed(false)}
                  />
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
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
