import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./app/shell/AppShell";
import {
  CalendarStub,
  ChatStub,
  DocumentsStub,
  EmailStub,
  MemoryStub,
  NotesStub,
  ResearchStub,
  SettingsStub,
  SkillsStub,
  TasksStub,
} from "./features/stubs";
import { Styleguide } from "./features/styleguide/Styleguide";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatStub />} />
        <Route path="/chat/:sessionId" element={<ChatStub />} />
        <Route path="/research" element={<ResearchStub />} />
        <Route path="/documents" element={<DocumentsStub />} />
        <Route path="/notes" element={<NotesStub />} />
        <Route path="/tasks" element={<TasksStub />} />
        <Route path="/calendar" element={<CalendarStub />} />
        <Route path="/email" element={<EmailStub />} />
        <Route path="/memory" element={<MemoryStub />} />
        <Route path="/skills" element={<SkillsStub />} />
        <Route path="/settings" element={<SettingsStub />} />
        {import.meta.env.DEV && <Route path="/styleguide" element={<Styleguide />} />}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}
