import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, Plus, CheckSquare } from "lucide-react";
import { useState } from "react";

import { api, queryKeys, Task } from "../../lib/api";
import { EmptyState, Input } from "../../components/ui";

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
    <div className="flex h-full flex-col p-8 gap-6 overflow-y-auto min-h-0 flex-1">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light text-ink-100 flex items-center gap-3">
          <CheckSquare className="size-6 text-claw-400" />
          The Wishing Well
        </h1>
        <Input
          placeholder="Search chores…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="flex flex-col gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTaskTitle.trim()) createMut.mutate(newTaskTitle.trim());
          }}
          className="flex items-center gap-3 bg-ink-900/50 border border-ink-800 rounded-ctl p-2 focus-within:border-claw-500/50 transition-colors"
        >
          <Plus className="w-5 h-5 text-ink-500 ml-2" />
          <input
            type="text"
            placeholder="Toss a new chore into the well..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-ink-100 placeholder:text-ink-600"
          />
        </form>
      </div>

      {tasks.length === 0 && !q ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Toss a coin into the well to set a new goal."
        />
      ) : (
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pb-8">
          {openTasks.map((t) => (
            <div
              key={t.id}
              className="group flex items-start gap-3 p-4 rounded-ctl bg-ink-900/40 border border-ink-800 hover:border-claw-500/30 transition-all"
            >
              <button
                className="mt-0.5 shrink-0"
                onClick={() => toggleMut.mutate({ id: t.id, status: "done" })}
              >
                <Circle className="w-5 h-5 text-ink-500 group-hover:text-claw-400 transition-colors" />
              </button>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-medium text-ink-100 leading-snug">{t.title}</span>
                {t.due_date_iso && (
                  <div className="flex items-center gap-1 text-xs text-ink-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(t.due_date_iso).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {doneTasks.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-ink-600 uppercase tracking-wider pl-1">
                Completed
              </h2>
              {doneTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-ctl opacity-50 transition-all"
                >
                  <button
                    className="mt-0.5 shrink-0"
                    onClick={() => toggleMut.mutate({ id: t.id, status: "open" })}
                  >
                    <CheckCircle2 className="w-5 h-5 text-ink-500 hover:text-ink-400" />
                  </button>
                  <span className="text-sm text-ink-400 line-through">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
