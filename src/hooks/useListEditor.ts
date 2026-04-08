"use client";

import { useState, useEffect } from "react";

export interface EditorToast {
  message: string;
  type: "success" | "error";
}

/**
 * Hook générique pour les éditeurs de listes (annuaire, PN sensibles, circuits, etc.)
 * Gère : state entries, hasChanges, saving, toast, mutations (add/edit/remove/moveUp/moveDown)
 */
export function useListEditor<T>(initial: T[]) {
  const [entries, setEntries] = useState<T[]>(initial);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<EditorToast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message: string, type: EditorToast["type"]) {
    setToast({ message, type });
  }

  function add(entry: T) {
    setEntries((prev) => [...prev, entry]);
    setHasChanges(true);
  }

  function edit(index: number, entry: T) {
    setEntries((prev) => prev.map((e, i) => (i === index ? entry : e)));
    setHasChanges(true);
  }

  function remove(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setHasChanges(true);
  }

  function moveDown(index: number) {
    setEntries((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setHasChanges(true);
  }

  return {
    entries,
    hasChanges,
    setHasChanges,
    saving,
    setSaving,
    toast,
    showToast,
    add,
    edit,
    remove,
    moveUp,
    moveDown,
  };
}
