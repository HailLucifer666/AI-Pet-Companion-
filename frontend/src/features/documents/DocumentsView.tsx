import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileCode, FileSpreadsheet, FileText, Plus, Trash2, X } from "lucide-react";
import { api, queryKeys, type Document } from "../../lib/api";
import { useUndoableDelete } from "../../lib/useUndoableDelete";
import { Button, EmptyState, IconButton, Input, Skeleton } from "../../components/ui";

const TYPE_ICONS = {
  md: FileText,
  html: FileCode,
  csv: FileSpreadsheet,
};

function Editor({
  doc,
  onSaved,
}: {
  doc: Document;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const dirty = title !== doc.title || content !== doc.content;

  useEffect(() => {
    setTitle(doc.title);
    setContent(doc.content);
  }, [doc.id, doc.title, doc.content]);

  const save = useMutation({
    mutationFn: () => api.updateDocument(doc.id, { title, content, doc_type: doc.doc_type }),
    onSuccess: onSaved,
  });

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-token-border p-3">
        <Input
          value={title}
          placeholder="Document title"
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md border-none bg-transparent text-lg font-medium"
        />
        <div className="flex-1" />
        {dirty && <span className="text-xs text-token-text-muted">savingâ€¦</span>}
      </div>
      <div className="flex flex-1 min-h-0">
        <textarea
          value={content}
          placeholder={`Write ${doc.doc_type.toUpperCase()} content here...`}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none bg-transparent p-5 font-mono text-sm text-token-text placeholder:text-token-text-muted focus:outline-none border-r border-token-border/50"
        />
        <div className="flex-1 min-w-0 bg-token-surface/30 overflow-auto p-5">
          {doc.doc_type === "md" && (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed [&_a]:text-token-primary [&_code]:bg-token-surface [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:rounded-md [&_pre]:bg-token-surface [&_pre]:p-3">
              <Markdown remarkPlugins={[remarkGfm]}>{content || "*Empty document*"}</Markdown>
            </div>
          )}
          {doc.doc_type === "html" && (
             <iframe 
                srcDoc={content} 
                className="w-full h-full border-none bg-white rounded" 
                sandbox="allow-scripts" 
             />
          )}
          {doc.doc_type === "csv" && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <tbody>
                  {content.split("\n").map((row, i) => (
                    <tr key={i} className="border-b border-token-border/50">
                      {row.split(",").map((cell, j) => (
                        <td key={j} className="px-3 py-2 border-r border-token-border/50 last:border-r-0">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentsView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.documents(q),
    queryFn: () => api.documents(q),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

  const create = useMutation({
    mutationFn: (doc_type: "md" | "html" | "csv") =>
      api.createDocument({ title: `Untitled.${doc_type}`, content: "", doc_type }),
    onSuccess: (res) => {
      invalidate();
      setOpenIds((prev) => [...prev, res.id]);
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
    message: (d) => `Deleted "${d.title}"`,
  });

  function onDelete(d: Document) {
    removeDoc(d);
    closeTab(d.id);
  }

  function openTab(id: number) {
    if (!openIds.includes(id)) {
      setOpenIds((prev) => [...prev, id]);
    }
    setActiveId(id);
  }

  function closeTab(id: number) {
    setOpenIds((prev) => {
      const next = prev.filter((i) => i !== id);
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }

  const openDocs = openIds
    .map((id) => data?.documents.find((d) => d.id === id))
    .filter(Boolean) as Document[];
  const activeDoc = openDocs.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-token-border bg-token-surface/30">
        <div className="flex items-center gap-2 p-3">
          <Input placeholder="Search documentsâ€¦" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="relative group">
            <IconButton icon={Plus} label="New document" onClick={() => create.mutate("md")} />
            <div className="absolute top-full right-0 mt-1 hidden group-hover:flex flex-col bg-token-surface border border-token-border rounded shadow-lg z-10 text-sm">
                <button onClick={(e) => { e.stopPropagation(); create.mutate("md"); }} className="px-4 py-2 hover:bg-token-surface-raised text-left w-24">Markdown</button>
                <button onClick={(e) => { e.stopPropagation(); create.mutate("html"); }} className="px-4 py-2 hover:bg-token-surface-raised text-left w-24">HTML</button>
                <button onClick={(e) => { e.stopPropagation(); create.mutate("csv"); }} className="px-4 py-2 hover:bg-token-surface-raised text-left w-24">CSV</button>
            </div>
          </div>
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
              const Icon = TYPE_ICONS[d.doc_type] || FileText;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }}
                  className={[
                    "group cursor-pointer rounded px-2.5 py-2 transition-colors flex items-center gap-2",
                    openIds.includes(d.id) ? "bg-token-surface" : "hover:bg-token-surface/50",
                  ].join(" ")}
                  onClick={() => openTab(d.id)}
                >
                  <Icon className="w-4 h-4 text-token-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm text-token-text">
                    {d.title || "Untitled"}
                  </span>
                  <button
                    className="hidden text-token-text-muted hover:text-red-400 group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(d);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {openDocs.length > 0 ? (
          <>
            <div className="flex items-center gap-1 border-b border-token-border px-2 bg-token-surface/30 overflow-x-auto no-scrollbar">
              {openDocs.map((d) => {
                const Icon = TYPE_ICONS[d.doc_type] || FileText;
                const isActive = d.id === activeId;
                return (
                  <div
                    key={d.id}
                    className={[
                      "flex items-center gap-2 px-3 py-2 cursor-pointer border-b-2 text-sm max-w-[200px] shrink-0 transition-colors group",
                      isActive ? "border-token-primary bg-token-surface" : "border-transparent text-token-text-muted hover:bg-token-surface/50"
                    ].join(" ")}
                    onClick={() => setActiveId(d.id)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate flex-1">{d.title}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(d.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 min-h-0 bg-token-surface-sunken">
              {activeDoc && <Editor key={activeDoc.id} doc={activeDoc} onSaved={invalidate} />}
            </div>
          </>
        ) : (
          <div className="flex-1 p-8">
            <EmptyState
              icon={FileText}
              title="Documents"
              description="Multi-tab editor for Markdown, HTML, and CSV. The companion can author and edit these for you."
              action={
                <Button onClick={() => create.mutate("md")}>
                  <Plus className="size-4" /> New document
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
