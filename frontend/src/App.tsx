import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "./lib/api";
import { hasWebGL } from "./world3d/quality";
import { Spinner } from "./components/ui";
import { AppShell } from "./app/shell/AppShell";
import { HatchRitual } from "./features/hatch/HatchRitual";
import { ChatView } from "./features/chat/ChatView";
import { MemoryView } from "./features/memory/MemoryView";
import { NotesView } from "./features/notes/NotesView";
import { SettingsView } from "./features/settings/SettingsView";
import {
  DocumentsStub,
  EmailStub,
  ResearchStub,
  SkillsStub,
} from "./features/stubs";
import { TasksView } from "./features/tasks/TasksView";
import { CalendarView } from "./features/calendar/CalendarView";
import { Styleguide } from "./features/styleguide/Styleguide";

// The world (Pixi) is heavy — lazy-load it so it never touches the main bundle.
const DenView = lazy(() => import("./features/den/DenView"));

function DenLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-ink-950">
      <Spinner />
    </div>
  );
}

function Shell() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/den" replace />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/chat/:sessionId" element={<ChatView />} />
        <Route path="/research" element={<ResearchStub />} />
        <Route path="/documents" element={<DocumentsStub />} />
        <Route path="/notes" element={<NotesView />} />
        <Route path="/tasks" element={<TasksView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/email" element={<EmailStub />} />
        <Route path="/memory" element={<MemoryView />} />
        <Route path="/skills" element={<SkillsStub />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route
          path="/den"
          element={
            <Suspense fallback={<DenLoading />}>
              <DenView />
            </Suspense>
          }
        />
        {import.meta.env.DEV && <Route path="/styleguide" element={<Styleguide />} />}
        <Route path="*" element={<Navigate to="/den" replace />} />
      </Route>
    </Routes>
  );
}

/** First-run gate: no pet yet → the hatch ritual; otherwise the full app.
 *  If the backend is unreachable we fall through to the shell (which shows the
 *  offline status) rather than trapping the user on a blank ritual. */
export function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.pet,
    queryFn: api.pet,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950">
        <Spinner />
      </div>
    );
  }
  if (!isError && data && data.pet === null) {
    return <HatchRitual brain={data.brain} cinematicMode={hasWebGL()} />;
  }
  return <Shell />;
}
