import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./app/shell/AppShell";
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
} from "./features/stubs";
import { Styleguide } from "./features/styleguide/Styleguide";

export function App() {
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
        {import.meta.env.DEV && <Route path="/styleguide" element={<Styleguide />} />}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}
