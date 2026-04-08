"use client";

import { useState, useEffect } from "react";
import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2,
  Phone, Mail, Tag, Save, CheckCircle2, AlertTriangle, Users,
} from "lucide-react";
import type { AnnuaireEntry } from "@/lib/types";
import AnnuaireForm from "./AnnuaireForm";

// ─── Types locaux ──────────────────────────────────────────────────────────────

interface Props {
  posteId: string;
  initialAnnuaire: AnnuaireEntry[];
}

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; index: number; entry: AnnuaireEntry }
  | null;

interface Toast {
  message: string;
  type: "success" | "error";
}

// ─── Composant ─────────────────────────────────────────────────────────────────

export default function PosteAnnuaireEditor({ posteId, initialAnnuaire }: Props) {
  const [entries, setEntries] = useState<AnnuaireEntry[]>(initialAnnuaire);
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Auto-dismiss du toast après 3 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type });
  }

  // ─── Mutations locales ────────────────────────────────────────────────────

  function handleAdd(entry: Omit<AnnuaireEntry, "ordre">) {
    setEntries((prev) => [...prev, { ...entry, ordre: prev.length }]);
    setModal(null);
    setHasChanges(true);
  }

  function handleEdit(index: number, entry: Omit<AnnuaireEntry, "ordre">) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...entry, ordre: e.ordre } : e))
    );
    setModal(null);
    setHasChanges(true);
  }

  function handleDelete(index: number) {
    if (!confirm("Supprimer cette entrée de l'annuaire ?")) return;
    setEntries((prev) =>
      prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, ordre: i }))
    );
    setHasChanges(true);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((e, i) => ({ ...e, ordre: i }));
    });
    setHasChanges(true);
  }

  function handleMoveDown(index: number) {
    setEntries((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((e, i) => ({ ...e, ordre: i }));
    });
    setHasChanges(true);
  }

  // ─── Sauvegarde ───────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/postes/${posteId}/annuaire`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annuaire: entries }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setHasChanges(false);
      showToast(`Annuaire sauvegardé — ${data.count} entrée(s)`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erreur inconnue", "error");
    } finally {
      setSaving(false);
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Annuaire téléphonique</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {entries.length} entrée{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          )}
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Liste */}
      <div className="p-4">
        {entries.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune entrée dans l&apos;annuaire.</p>
            <p className="text-xs mt-1">Cliquez sur &laquo; Ajouter &raquo; pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry, index) => (
              <EntryRow
                key={index}
                entry={entry}
                index={index}
                total={entries.length}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onEdit={() => setModal({ mode: "edit", index, entry })}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Barre de sauvegarde persistante */}
      {hasChanges && entries.length > 0 && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Modifications non sauvegardées
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            <Save size={12} />
            {saving ? "Sauvegarde…" : "Sauvegarder l'annuaire"}
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <AnnuaireForm
          entry={modal.mode === "edit" ? modal.entry : null}
          onSave={(entry) => {
            if (modal.mode === "add") handleAdd(entry);
            else handleEdit(modal.index, entry);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Ligne d'entrée ────────────────────────────────────────────────────────────

function EntryRow({
  entry, index, total, onMoveUp, onMoveDown, onEdit, onDelete,
}: {
  entry: AnnuaireEntry;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 group">
      {/* Boutons de réordonnancement */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          title="Monter"
          className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
        >
          <ChevronUp size={15} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          title="Descendre"
          className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.section && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              <Tag size={10} />
              {entry.section}
            </span>
          )}
          <span className="font-medium text-gray-900 text-sm">{entry.nom}</span>
          {entry.fonction && (
            <span className="text-xs text-gray-500">{entry.fonction}</span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-0.5 flex-wrap">
          {entry.telephone && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Phone size={11} className="text-gray-400" />
              {entry.telephone}
            </span>
          )}
          {entry.email && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Mail size={11} className="text-gray-400" />
              {entry.email}
            </span>
          )}
          {entry.note && (
            <span className="text-xs text-gray-400 italic truncate max-w-xs">{entry.note}</span>
          )}
        </div>
      </div>

      {/* Actions — visibles au hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          title="Modifier"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Supprimer"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
