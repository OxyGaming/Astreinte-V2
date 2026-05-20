"use client";

import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2, Save,
  CheckCircle2, AlertTriangle, Link2, PenLine, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import type { Lien, LienRef } from "@/lib/types";
import { useListEditor } from "@/hooks/useListEditor";
import LienForm from "./LienForm";

interface Props {
  /** URL de l'endpoint PUT, ex : /api/admin/fiches/<id>/liens */
  endpoint: string;
  initialEntries: LienRef[];
  collection: Lien[];
}

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; index: number; entry: LienRef }
  | null;

interface ResolvedRow {
  libelle: string;
  url: string;
  linked: boolean;
  orphan: boolean;
}

function resolveRow(ref: LienRef, collection: Lien[]): ResolvedRow {
  if (ref.lienId) {
    const lien = collection.find((l) => l.id === ref.lienId);
    if (lien) {
      return { libelle: ref.libelle?.trim() || lien.libelle, url: lien.url, linked: true, orphan: false };
    }
    return { libelle: ref.libelle?.trim() || "Lien indisponible", url: "", linked: true, orphan: true };
  }
  return { libelle: ref.libelle?.trim() || ref.url || "", url: ref.url ?? "", linked: false, orphan: false };
}

export default function LiensEditor({ endpoint, initialEntries, collection }: Props) {
  const {
    entries, hasChanges, setHasChanges,
    saving, setSaving, toast, showToast,
    add, edit, remove, moveUp, moveDown,
  } = useListEditor<LienRef>(initialEntries);

  const [modal, setModal] = useState<ModalState>(null);

  function handleAdd(entry: LienRef) { add(entry); setModal(null); }
  function handleEdit(index: number, entry: LienRef) { edit(index, entry); setModal(null); }
  function handleDelete(index: number) {
    if (!confirm("Retirer ce lien ?")) return;
    remove(index);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liens: entries }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setHasChanges(false);
      showToast(`Liens sauvegardés — ${data.count} lien(s)`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erreur inconnue", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Liens utiles</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {entries.length} lien{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Save size={14} />
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          )}
          <button onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} />
            Ajouter
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="p-4">
        {entries.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Link2 size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun lien rattaché.</p>
            <p className="text-xs mt-1">Cliquez sur « Ajouter » pour en rattacher un.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry, index) => (
              <LienRow
                key={index}
                row={resolveRow(entry, collection)}
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

      {hasChanges && entries.length > 0 && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle size={12} />Modifications non sauvegardées
          </p>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors">
            <Save size={12} />
            {saving ? "Sauvegarde…" : "Sauvegarder les liens"}
          </button>
        </div>
      )}

      {modal && (
        <LienForm
          entry={modal.mode === "edit" ? modal.entry : null}
          collection={collection}
          onSave={(entry) => { if (modal.mode === "add") handleAdd(entry); else handleEdit(modal.index, entry); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function LienRow({ row, index, total, onMoveUp, onMoveDown, onEdit, onDelete }: {
  row: ResolvedRow; index: number; total: number;
  onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 group">
      <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
        <button onClick={onMoveUp} disabled={index === 0} title="Monter"
          className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
          <ChevronUp size={15} />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} title="Descendre"
          className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
          <ChevronDown size={15} />
        </button>
      </div>

      {row.orphan
        ? <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
        : row.linked
          ? <Link2 size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
          : <PenLine size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
      }

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{row.libelle}</span>
          {row.linked && !row.orphan && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Collection</span>
          )}
          {row.orphan && (
            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Lien supprimé</span>
          )}
        </div>
        {row.url && (
          <p className="text-xs text-gray-400 mt-0.5 truncate font-mono">{row.url}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {row.url && (
          <a href={row.url} target="_blank" rel="noopener noreferrer" title="Ouvrir"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <ExternalLink size={14} />
          </a>
        )}
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
