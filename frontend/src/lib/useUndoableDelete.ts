/** Undoable delete: optimistic removal + a 5s undo toast. The real delete is
 *  deferred until the toast expires, so "Undo" is a clean cancel — no
 *  resurrection-with-a-new-id. Timers are cancelled on unmount. */

import { useCallback, useEffect, useRef } from "react";
import { toast } from "../components/ui";

interface UndoableDeleteOptions<T> {
  /** Remove the item from the UI/cache immediately (optimistic). */
  remove: (item: T) => void;
  /** Put it back when the user hits Undo (typically: invalidate the query). */
  restore: (item: T) => void;
  /** Perform the real delete once the undo window elapses. */
  commit: (item: T) => void | Promise<void>;
  /** Toast title for this deletion. */
  message: (item: T) => string;
  /** Undo window in ms (default 5000). */
  delayMs?: number;
}

export function useUndoableDelete<T>({
  remove,
  restore,
  commit,
  message,
  delayMs = 5000,
}: UndoableDeleteOptions<T>): (item: T) => void {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);

  return useCallback(
    (item: T) => {
      remove(item);
      let committed = false;
      const timer = setTimeout(() => {
        committed = true;
        timers.current.delete(timer);
        void commit(item);
      }, delayMs);
      timers.current.add(timer);

      toast({
        title: message(item),
        durationMs: delayMs,
        action: {
          label: "Undo",
          onClick: () => {
            if (committed) return;
            clearTimeout(timer);
            timers.current.delete(timer);
            restore(item);
          },
        },
      });
    },
    [remove, restore, commit, message, delayMs],
  );
}
