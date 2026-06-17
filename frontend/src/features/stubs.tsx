/** Phase-0 surface stubs: intentional empty states, replaced phase by phase. */

import {
  Brain,
  Calendar,
  ListTodo,
  Mail,
  MessageSquare,
  Settings,
  StickyNote,
  Telescope,
  Wrench,
  Home,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "../components/ui";

function Stub({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="h-full p-8">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}

export const ChatStub = () => (
  <Stub
    icon={MessageSquare}
    title="Chat"
    description="Talk to your agent. Streaming sessions land in Phase 1 — the backend /api/chat endpoint already works."
  />
);
export const ResearchStub = () => (
  <Stub
    icon={Telescope}
    title="Research"
    description="Multi-step deep research with cited reports. Arrives in Phase 3."
  />
);

export const NotesStub = () => (
  <Stub
    icon={StickyNote}
    title="Notes"
    description="Quick capture and browse. Arrives in Phase 1."
  />
);
export const TasksStub = () => (
  <Stub
    icon={ListTodo}
    title="Tasks"
    description="Lists, statuses, due dates — and the agent can file tasks for you. Arrives in Phase 3."
  />
);
export const CalendarStub = () => (
  <Stub
    icon={Calendar}
    title="Calendar"
    description="Month and week views fed by tasks and events. Arrives in Phase 3."
  />
);
export const EmailStub = () => (
  <Stub
    icon={Mail}
    title="Email"
    description="IMAP triage with AI tags and drafted replies. Arrives in Phase 4."
  />
);
export const MemoryStub = () => (
  <Stub
    icon={Brain}
    title="Memory"
    description="Browse and edit everything the agent remembers about you. Arrives in Phase 1."
  />
);
export const SkillsStub = () => (
  <Stub
    icon={Wrench}
    title="Skills"
    description="The agent writes its own skills; you approve them here. Arrives in Phase 2."
  />
);
export const SettingsStub = () => (
  <Stub
    icon={Settings}
    title="Settings"
    description="Providers, API keys, channels, scheduler. Minimal version arrives in Phase 1."
  />
);
export const DenStub = () => (
  <Stub
    icon={Home}
    title="Den"
    description="Growth ladder and XP arrive in M-0.2d."
  />
);
