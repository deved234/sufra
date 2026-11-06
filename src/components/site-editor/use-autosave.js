"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft } from "@/lib/site/actions";

const DELAY_MS = 1500;

// Saves the blocks a moment after the last change, one save at a time, so a slow answer
// can't land after a newer one. Going back to what's already saved needs no save, which
// the check by reference catches: undo returns the very same list.
//
// status: saved, dirty, saving, failed or conflict.
export function useAutosave({ slug, blocks, initialRev }) {
  const [status, setStatus] = useState("saved");
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null);
  const rev = useRef(initialRev);
  const saved = useRef(blocks);
  const latest = useRef(blocks);
  const saving = useRef(false);
  const blocked = useRef(false);
  const timer = useRef(null);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current || blocked.current) return;
    saving.current = true;
    setError(null);
    // A loop, because more can change while a save is on its way
    while (latest.current !== saved.current) {
      const sending = latest.current;
      setStatus("saving");
      let result;
      try {
        result = await saveDraft(slug, sending, rev.current);
      } catch {
        // Usually the connection. The work is still here, so it can be tried again.
        result = { error: "saveFailed" };
      }
      if (result.conflict) {
        blocked.current = true;
        setConflict({ blocks: result.blocks, rev: result.rev });
        setStatus("conflict");
        saving.current = false;
        return;
      }
      if (result.error) {
        setError(result.error);
        setStatus("failed");
        saving.current = false;
        return;
      }
      rev.current = result.rev;
      saved.current = sending;
    }
    saving.current = false;
    setStatus("saved");
  }, [slug]);

  useEffect(() => {
    latest.current = blocks;
    if (blocks === saved.current) {
      clearTimeout(timer.current);
      if (!saving.current && !blocked.current) setStatus("saved");
      return undefined;
    }
    if (!blocked.current) setStatus(saving.current ? "saving" : "dirty");
    timer.current = setTimeout(flush, DELAY_MS);
    return () => clearTimeout(timer.current);
  }, [blocks, flush]);

  // Don't leave with work unsaved, and try again the moment the connection returns
  useEffect(() => {
    const onLeave = (event) => {
      if (latest.current !== saved.current || saving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  // The two answers to another tab having saved first:
  // take theirs (the caller replaces its blocks with these)...
  const takeTheirs = useCallback(() => {
    rev.current = conflict.rev;
    saved.current = conflict.blocks;
    latest.current = conflict.blocks;
    blocked.current = false;
    const { blocks: theirs } = conflict;
    setConflict(null);
    setStatus("saved");
    return theirs;
  }, [conflict]);

  // ...or write ours over them
  const keepMine = useCallback(() => {
    rev.current = conflict.rev;
    blocked.current = false;
    setConflict(null);
    flush();
  }, [conflict, flush]);

  return { status, error, conflict: Boolean(conflict), retry: flush, takeTheirs, keepMine };
}
