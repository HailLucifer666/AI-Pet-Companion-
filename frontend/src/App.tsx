import { Navigate, Route, Routes } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "./lib/api";
import { Spinner } from "./components/ui";
import { AppShell } from "./app/shell/AppShell";
import { HatchRitual } from "./features/hatch/HatchRitual";
import { ChatView } from "./features/chat/ChatView";
import { MemoryView } from "./features/memory/MemoryView";
import { NotesView } from "./features/notes/NotesView";
import { SettingsView } from "./features/settings/SettingsView";
import {
  CalendarStub,
  DocumentsStub,
  EmailStub,
  ResearchStub,
  SkillsStub,
  TasksStub,
  DenStub,
} from "./features/stubs";
import { Styleguide } from "./features/styleguide/Styleguide";

function Shell() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/chat/:sessionId" element={<ChatView />} />
        <Route path="/research" element={<ResearchStub />} />
        <Route path="/documents" element={<DocumentsStub />} />
        <Route path="/notes" element={<NotesView />} />
        <Route path="/tasks" element={<TasksStub />} />
        <Route path="/calendar" element={<CalendarStub />} />
        <Route path="/email" element={<EmailStub />} />
        <Route path="/memory" element={<MemoryView />} />
        <Route path="/skills" element={<SkillsStub />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/den" element={<DenStub />} />
        {import.meta.env.DEV && <Route path="/styleguide" element={<Styleguide />} />}
        <Route path="*" element={<Navigate to="/chat" replace />} />
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
    return <HatchRitual brain={data.brain} />;
  }
  return <Shell />;
}
