"use client";

import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2,
  MapPin, Save, CheckCircle2, AlertTriangle, Navigation,
} from "lucide-react";
import { useState } from "react";
import type { PointAcces } from "@/lib/types";
import { useListEditor } from "@/hooks/useListEditor";
import PointAccesForm from "./PointAccesForm";

interface Props {
  secteurId: string;
  initialEntries: PointAcces[];
}

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; index: number; entry: PointAcces }
  | null;

export default function SecteurPointsAccesEditor({ secteurId, initialEntries }: Props) {
  const {
    entries, hasChanges, setHasChanges,
    saving, setSaving, toast, showToast,
    add, edit, remove, moveUp, moveDown,
  } = useListEditor<PointAcces>(initialEntries);

  const [modal, setModal] = useState<ModalState>(null);

  function handleAdd(entry: PointAcces) {
    add(entry);
    setModal(null);
  }

  function handleEdit(index: number, entry: PointAcces) {
    edit(index, entry);
    setModal(null);
  }

  function handleDelete(index: number) {
    if (!confirm("Supprimer ce point d'accès ?")) return;
    remove(index);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/secteurs/${secteurId}/points-acces`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsAcces: entries }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setHasChanges(false);
      showToast(`Points d'accès sauvegardés — ${data.count} entrée(s)`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erreur inconnue", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Points d'accès</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {entries.length} point{entries.length !== 1 ? "s" : ""} d'accès
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
            <Navigation size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun point d'accès renseigné.</p>
            <p className="text-xs mt-1">Cliquez sur « Ajouter » pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry, index) => (
              <PointAccesRow
                key={index}
                entry={entry}
                index={index}
                total={entries.length}
                onMoveUp={() => moveUp(index)}
                onMoveDown={() => moveDown(index)}
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
            {saving ? "Sauvegarde…" : "Sauvegarder les points d'accès"}
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <PointAccesForm
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

// ─── Ligne ──────────────────────────────────────────────────────────────────────

function PointAccesRow({
  entry, index, total, onMoveUp, onMoveDown, onEdit, onDelete,
}: {
  entry: PointAcces;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 group">
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button onClick={onMoveUp} disabled={index === 0} title="Monter"
          className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
          <ChevronUp size={15} />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} title="Descendre"
          className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
          <ChevronDown size={15} />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{entry.nom}</span>
          {entry.code && (
            <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
              {entry.code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-0.5 flex-wrap">
          {entry.adresse && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin size={11} className="text-gray-400" />
              {entry.adresse}
            </span>
          )}
          {entry.gps && (
            <span className="text-xs text-gray-400 font-mono">{entry.gps}</span>
          )}
          {entry.note && (
            <span className="text-xs text-gray-400 italic truncate max-w-xs">{entry.note}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} title="Modifier"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} title="Supprimer"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
