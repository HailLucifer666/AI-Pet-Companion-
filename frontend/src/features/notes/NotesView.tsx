import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import { api, queryKeys, type Note } from "../../lib/api";
import { Button, EmptyState, IconButton, Input } from "../../components/ui";

function Editor({ note, onSaved }: { note: Note; onSaved: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content_md);
  const [preview, setPreview] = useState(false);
  const dirty = title !== note.title || content !== note.content_md;

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content_md);
    setPreview(false);
  }, [note.id, note.title, note.content_md]);

  const save = useMutation({
    mutationFn: () => api.updateNote(note.id, { title, content_md: content }),
    onSuccess: onSaved,
  });

  // Autosave 1.5s after the last edit.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 p-3">
        <Input
          value={title}
          placeholder="Note title"
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md border-none bg-transparent text-base font-medium"
        />
        <div className="flex-1" />
        {dirty && <span className="text-xs text-ink-500">saving…</span>}
        <IconButton
          icon={preview ? Pencil : Eye}
          label={preview ? "Edit" : "Preview"}
          onClick={() => setPreview(!preview)}
        />
      </div>
      {preview ? (
        <div className="min-h-0 flex-1 overflow-auto p-5 text-sm leading-relaxed [&_a]:text-claw-400 [&_code]:bg-ink-850 [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:rounded-ctl [&_pre]:bg-ink-850 [&_pre]:p-3">
          <Markdown remarkPlugins={[remarkGfm]}>{content || "*Empty note*"}</Markdown>
        </div>
      ) : (
        <textarea
          value={content}
          placeholder="Write in markdown…"
          onChange={(e) => setContent(e.target.value)}
          className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
      )}
    </div>
  );
}

export function NotesView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const { data } = useQuery({ queryKey: queryKeys.notes(q), queryFn: () => api.notes(q) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const create = useMutation({
    mutationFn: () => api.createNote({ title: "Untitled", content_md: "" }),
    onSuccess: (res) => {
      invalidate();
      setActiveId(res.id);
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteNote(id),
    onSuccess: (_d, id) => {
      invalidate();
      if (id === activeId) setActiveId(null);
    },
  });

  const active = data?.notes.find((n) => n.id === activeId) ?? null;

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-ink-800 bg-ink-900/50">
        <div className="flex items-center gap-2 p-3">
          <Input placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
          <IconButton icon={Plus} label="New note" onClick={() => create.mutate()} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          {data?.notes.map((n) => (
            <div
              key={n.id}
              className={[
                "group cursor-pointer rounded-ctl px-2.5 py-2",
                n.id === activeId ? "bg-ink-800" : "hover:bg-ink-850",
              ].join(" ")}
              onClick={() => setActiveId(n.id)}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink-100">
                  {n.title || "Untitled"}
                </span>
                <button
                  aria-label="Delete note"
                  className="hidden text-ink-500 hover:text-danger group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove.mutate(n.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="truncate text-xs text-ink-500">
                {n.content_md.slice(0, 80) || "Empty"}
              </p>
            </div>
          ))}
        </div>
      </aside>
      {active ? (
        <Editor note={active} onSaved={invalidate} />
      ) : (
        <div className="flex-1 p-8">
          <EmptyState
            icon={StickyNote}
            title="Notes"
            description="Quick capture in markdown. The agent can create and search these too."
            action={
              <Button onClick={() => create.mutate()}>
                <Plus className="size-4" /> New note
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
