import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, queryKeys, type Memory, type MemoryType } from "../../lib/api";
import { useUndoableDelete } from "../../lib/useUndoableDelete";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Select,
  Skeleton,
  Textarea,
} from "../../components/ui";

// Radix Select forbids empty-string item values, so "all" is a sentinel
// mapped back to "" (no filter) at the call site.
const ALL_TYPES = "all";
const TYPE_FILTER_OPTIONS = [
  { value: ALL_TYPES, label: "all types" },
  ...(["identity", "preference", "project", "event", "fact"] as const).map((t) => ({
    value: t,
    label: t,
  })),
];
const TYPE_OPTIONS = (["identity", "preference", "project", "event", "fact"] as const).map((t) => ({
  value: t,
  label: t,
}));

const typeTone: Record<MemoryType, "accent" | "ok" | "warn" | "neutral" | "danger"> = {
  identity: "accent",
  preference: "ok",
  project: "warn",
  event: "neutral",
  fact: "neutral",
};

function MemoryRow({ memory }: { memory: Memory }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memory"] });
  const update = useMutation({
    mutationFn: () => api.updateMemory(memory.id, draft),
    onSuccess: () => {
      setEditing(false);
      invalidate();
    },
  });
  const forget = useUndoableDelete<Memory>({
    remove: (m) =>
      queryClient.setQueriesData<{ memories: Memory[] }>({ queryKey: ["memory"] }, (old) =>
        old ? { memories: old.memories.filter((x) => x.id !== m.id) } : old,
      ),
    restore: invalidate,
    commit: async (m) => {
      await api.deleteMemory(m.id);
      invalidate();
    },
    message: () => "Memory forgotten",
  });

  return (
    <div className="group flex items-start gap-3 rounded-ctl px-3 py-2.5 transition-colors hover:bg-ink-900">
      <Badge tone={typeTone[memory.type]}>{memory.type}</Badge>
      {editing ? (
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <IconButton icon={Check} label="Save" onClick={() => update.mutate()} />
          <IconButton icon={X} label="Cancel" onClick={() => setEditing(false)} />
        </div>
      ) : (
        <>
          <p className="min-w-0 flex-1 text-sm text-ink-100">{memory.content}</p>
          <span className="hidden shrink-0 gap-1 group-hover:flex">
            <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(true)} />
            <IconButton
              icon={Trash2}
              label="Forget"
              className="hover:text-danger"
              onClick={() => forget(memory)}
            />
          </span>
        </>
      )}
    </div>
  );
}

function ProfileCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: queryKeys.profile, queryFn: api.profile });
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const save = useMutation({
    mutationFn: api.setProfile,
    onSuccess: () => {
      setKey("");
      setValue("");
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
  return (
    <Card className="w-72 shrink-0 self-start">
      <h3 className="font-display font-medium">Profile</h3>
      <p className="mt-0.5 text-xs text-ink-500">
        Always injected into the agent's context.
      </p>
      <div className="mt-3 space-y-1.5">
        {data?.profile.map((entry) => (
          <div key={entry.key} className="group flex items-center gap-2 text-sm">
            <span className="text-ink-500">{entry.key}</span>
            <span className="min-w-0 flex-1 truncate text-right">{entry.value}</span>
            <button
              aria-label={`Remove ${entry.key}`}
              className="hidden text-ink-500 hover:text-danger group-hover:block"
              onClick={() => save.mutate({ key: entry.key, value: "" })}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {data && data.profile.length === 0 && (
          <p className="text-xs text-ink-500">Nothing yet — add name, timezone, role…</p>
        )}
      </div>
      <form
        className="mt-3 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (key.trim() && value.trim()) save.mutate({ key: key.trim(), value: value.trim() });
        }}
      >
        <Input placeholder="key" value={key} onChange={(e) => setKey(e.target.value)} className="w-24" />
        <Input placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit" variant="ghost" disabled={!key.trim() || !value.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>
    </Card>
  );
}

export function MemoryView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [newType, setNewType] = useState<MemoryType>("fact");
  const [newContent, setNewContent] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.memory(q, type),
    queryFn: () => api.memory(q, type),
  });
  const create = useMutation({
    mutationFn: () => api.createMemory({ type: newType, content: newContent.trim() }),
    onSuccess: () => {
      setNewContent("");
      queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-4">
          <h1 className="text-xl font-bold">Memory</h1>
          <p className="text-sm text-ink-500">What the agent knows. Edit or forget anything.</p>
        </header>
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Search memories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select
            ariaLabel="Filter by type"
            value={type || ALL_TYPES}
            onValueChange={(v) => setType(v === ALL_TYPES ? "" : v)}
            options={TYPE_FILTER_OPTIONS}
            className="w-32"
          />
        </div>
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newContent.trim()) create.mutate();
          }}
        >
          <Select
            ariaLabel="New memory type"
            value={newType}
            onValueChange={(v) => setNewType(v as MemoryType)}
            options={TYPE_OPTIONS}
            className="w-32"
          />
          <Input
            placeholder="Add a memory the agent should keep…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <Button type="submit" disabled={!newContent.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
        <div className="min-h-0 flex-1 overflow-auto rounded-card border border-ink-800">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.memories.length > 0 ? (
            <div className="divide-y divide-ink-850">
              {data.memories.map((m) => (
                <MemoryRow key={m.id} memory={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Brain}
              title={q ? "No matches" : "No memories yet"}
              description={
                q
                  ? "Try different terms — search is semantic and keyword."
                  : "Chat with the agent or add facts manually; durable ones land here."
              }
            />
          )}
        </div>
      </div>
      <ProfileCard />
    </div>
  );
}
