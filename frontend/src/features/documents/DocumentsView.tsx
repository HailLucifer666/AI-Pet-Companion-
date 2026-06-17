import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Pencil, Plus, FileText, Trash2, FileCode, FileSpreadsheet, File } from "lucide-react";
import { api, queryKeys, type Document } from "../../lib/api";
import { useUndoableDelete } from "../../lib/useUndoableDelete";
import { Button, EmptyState, IconButton, Input, Skeleton, cx } from "../../components/ui";

const TYPE_ICONS = {
  md: FileText,
  html: FileCode,
  csv: FileSpreadsheet,
};

function Editor({ doc, onSaved }: { doc: Document; onSaved: () => void }) {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [docType, setDocType] = useState<"md" | "html" | "csv">(doc.doc_type);
  const [preview, setPreview] = useState(false);
  const dirty = title !== doc.title || content !== doc.content || docType !== doc.doc_type;

  useEffect(() => {
    setTitle(doc.title);
    setContent(doc.content);
    setDocType(doc.doc_type);
    setPreview(false);
  }, [doc.id, doc.title, doc.content, doc.doc_type]);

  const save = useMutation({
    mutationFn: () => api.updateDocument(doc.id, { title, content, doc_type: docType }),
    onSuccess: onSaved,
  });

  // Autosave 1.5s after the last edit.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, docType]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 p-3">
        <Input
          value={title}
          placeholder="Document title"
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md border-none bg-transparent text-base font-medium"
        />
        <div className="flex gap-1 ml-4 border border-ink-800 rounded-ctl p-1">
          {(["md", "html", "csv"] as const).map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={cx(
                  "px-2 py-1 rounded text-xs font-medium uppercase transition-colors flex items-center gap-1",
                  docType === t ? "bg-ink-800 text-ink-100" : "text-ink-500 hover:text-ink-300"
                )}
              >
                <Icon className="size-3" /> {t}
              </button>
            );
          })}
        </div>
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
          {docType === "md" ? (
            <Markdown remarkPlugins={[remarkGfm]}>{content || "*Empty document*"}</Markdown>
          ) : docType === "html" ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <pre className="font-mono text-xs">{content}</pre>
          )}
        </div>
      ) : (
        <textarea
          value={content}
          placeholder={`Write in ${docType.toUpperCase()}…`}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
      )}
    </div>
  );
}

export function DocumentsView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({ queryKey: queryKeys.documents(q), queryFn: () => api.documents(q) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

  const create = useMutation({
    mutationFn: () => api.createDocument({ title: "Untitled", content: "", doc_type: "md" }),
    onSuccess: (res) => {
      invalidate();
      setActiveId(res.id);
    },
  });

  const removeDoc = useUndoableDelete<Document>({
    remove: (d) =>
      queryClient.setQueriesData<{ documents: Document[] }>({ queryKey: ["documents"] }, (old) =>
        old ? { documents: old.documents.filter((x) => x.id !== d.id) } : old,
      ),
    restore: invalidate,
    commit: async (d) => {
      await api.deleteDocument(d.id);
      invalidate();
    },
    message: (d) => `Deleted "${d.title || "Untitled"}"`,
  });

  function onDelete(d: Document) {
    removeDoc(d);
    if (d.id === activeId) setActiveId(null);
  }

  const active = data?.documents.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-ink-800 bg-ink-900/50">
        <div className="flex items-center gap-2 p-3">
          <Input placeholder="Search archives…" value={q} onChange={(e) => setQ(e.target.value)} />
          <IconButton icon={Plus} label="New document" onClick={() => create.mutate()} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          {isLoading ? (
            <div className="space-y-1.5 px-1 pt-1">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            data?.documents.map((d, i) => {
              const Icon = TYPE_ICONS[d.doc_type] || File;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }}
                  className={[
                    "group cursor-pointer rounded-ctl px-2.5 py-2 transition-colors",
                    d.id === activeId ? "bg-ink-800" : "hover:bg-ink-850",
                  ].join(" ")}
                  onClick={() => setActiveId(d.id)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-ink-500" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-100">
                      {d.title || "Untitled"}
                    </span>
                    <button
                      aria-label="Delete document"
                      className="hidden text-ink-500 hover:text-danger group-hover:block"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <p className="truncate text-xs text-ink-500 pl-5.5">
                    {d.content.slice(0, 80) || "Empty"}
                  </p>
                </motion.div>
              );
            })
          )}
        </div>
      </aside>
      {active ? (
        <Editor doc={active} onSaved={invalidate} />
      ) : (
        <div className="flex-1 p-8">
          <EmptyState
            icon={FileText}
            title="The Archives"
            description="A space for structured documents, raw data, and code. The companion writes here."
            action={
              <Button onClick={() => create.mutate()}>
                <Plus className="size-4" /> New document
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
