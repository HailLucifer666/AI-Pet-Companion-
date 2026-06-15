import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, Plus } from "lucide-react";
import { useState } from "react";

import { api, queryKeys, Task } from "../../lib/api";

export function TasksView() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { data } = useQuery({
    queryKey: queryKeys.tasks(q),
    queryFn: () => api.tasks(q),
  });

  const createMut = useMutation({
    mutationFn: (title: string) =>
      api.createTask({ title, status: "open", tags: [] }),
    onSuccess: () => {
      setNewTaskTitle("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task["status"] }) =>
      api.updateTask(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = data?.tasks || [];
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex h-full flex-col p-6 text-token-text gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light">Tasks</h1>
        <input
          type="text"
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-48 bg-token-surface border border-token-border rounded px-3 py-1 text-sm focus:outline-none focus:border-token-primary/50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTaskTitle.trim()) createMut.mutate(newTaskTitle.trim());
          }}
          className="flex items-center gap-2 bg-token-surface/50 border border-token-border/50 rounded-lg p-2 focus-within:border-token-primary/50 transition-colors"
        >
          <Plus className="w-5 h-5 text-token-text-muted" />
          <input
            type="text"
            placeholder="Add a new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
          />
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {openTasks.map((t) => (
          <div
            key={t.id}
            className="group flex items-start gap-3 p-3 rounded-lg bg-token-surface border border-token-border hover:border-token-primary/30 transition-all"
          >
            <button
              className="mt-0.5 shrink-0"
              onClick={() => toggleMut.mutate({ id: t.id, status: "done" })}
            >
              <Circle className="w-5 h-5 text-token-text-muted hover:text-token-primary transition-colors" />
            </button>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium leading-snug">{t.title}</span>
              {t.due_date_iso && (
                <div className="flex items-center gap-1 text-xs text-token-text-muted">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(t.due_date_iso).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {doneTasks.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-token-text-muted uppercase tracking-wider">
              Completed
            </h2>
            {doneTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3 rounded-lg opacity-50 transition-all"
              >
                <button
                  className="mt-0.5 shrink-0"
                  onClick={() => toggleMut.mutate({ id: t.id, status: "open" })}
                >
                  <CheckCircle2 className="w-5 h-5 text-token-text-muted" />
                </button>
                <span className="text-sm line-through">{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
