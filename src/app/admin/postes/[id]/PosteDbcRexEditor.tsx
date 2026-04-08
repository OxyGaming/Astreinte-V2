"use client";

import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2,
  Save, CheckCircle2, AlertTriangle, Thermometer, MessageSquare, X,
} from "lucide-react";
import { useState } from "react";
import type { Dbc } from "@/lib/types";
import { useListEditor } from "@/hooks/useListEditor";
import DbcForm from "./DbcForm";

// ─── DBC Editor ───────────────────────────────────────────────────────────────

interface DbcProps {
  posteId: string;
  initialEntries: Dbc[];
}

type DbcModal =
  | { mode: "add" }
  | { mode: "edit"; index: number; entry: Dbc }
  | null;

export function PosteDbcEditor({ posteId, initialEntries }: DbcProps) {
  const {
    entries, hasChanges, setHasChanges,
    saving, setSaving, toast, showToast,
    add, edit, remove, moveUp, moveDown,
  } = useListEditor<Dbc>(initialEntries);

  const [modal, setModal] = useState<DbcModal>(null);

  function handleAdd(entry: Dbc) { add(entry); setModal(null); }
  function handleEdit(index: number, entry: Dbc) { edit(index, entry); setModal(null); }
  function handleDelete(index: number) {
    if (!confirm("Supprimer ce DBC ?")) return;
    remove(index);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/postes/${posteId}/dbc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbc: entries.length > 0 ? entries : null }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setHasChanges(false);
      showToast(`DBC sauvegardés — ${data.count} entrée(s)`, "success");
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
          <h2 className="font-semibold text-gray-900">Détecteurs de Boîte Chaude — DBC</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {entries.length > 0 ? `${entries.length} détecteur${entries.length !== 1 ? "s" : ""}` : "optionnel"}
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
          <div className="py-8 text-center text-gray-400">
            <Thermometer size={26} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun DBC pour ce poste.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry, index) => (
              <DbcRow key={index} entry={entry} index={index} total={entries.length}
                onMoveUp={() => moveUp(index)} onMoveDown={() => moveDown(index)}
                onEdit={() => setModal({ mode: "edit", index, entry })}
                onDelete={() => handleDelete(index)} />
            ))}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={12} />Modifications non sauvegardées</p>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors">
            <Save size={12} />
            {saving ? "Sauvegarde…" : "Sauvegarder les DBC"}
          </button>
        </div>
      )}

      {modal && (
        <DbcForm
          entry={modal.mode === "edit" ? modal.entry : null}
          onSave={(entry) => { if (modal.mode === "add") handleAdd(entry); else handleEdit(modal.index, entry); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function DbcRow({ entry, index, total, onMoveUp, onMoveDown, onEdit, onDelete }: {
  entry: Dbc; index: number; total: number;
  onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void; onDelete: () => void;
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
          <span className="inline-flex items-center text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
            <Thermometer size={10} className="mr-1" />{entry.designation}
          </span>
          {entry.voie && <span className="text-xs text-gray-600">{entry.voie}</span>}
        </div>
        {entry.note && <p className="text-xs text-gray-400 italic mt-0.5">{entry.note}</p>}
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

// ─── REX Editor ───────────────────────────────────────────────────────────────

interface RexProps {
  posteId: string;
  initialEntries: string[];
}

export function PosteRexEditor({ posteId, initialEntries }: RexProps) {
  const {
    entries, hasChanges, setHasChanges,
    saving, setSaving, toast, showToast,
    add, edit, remove, moveUp, moveDown,
  } = useListEditor<string>(initialEntries);

  const [addingText, setAddingText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [addError, setAddError] = useState("");

  function handleAdd() {
    const text = addingText.trim();
    if (!text) { setAddError("Le texte ne peut pas être vide"); return; }
    add(text);
    setAddingText("");
    setAddError("");
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingText(entries[index]);
  }

  function confirmEdit() {
    if (editingIndex === null) return;
    const text = editingText.trim();
    if (!text) return;
    edit(editingIndex, text);
    setEditingIndex(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/postes/${posteId}/rex`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rex: entries.length > 0 ? entries : null }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setHasChanges(false);
      showToast(`REX sauvegardés — ${data.count} entrée(s)`, "success");
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
          <h2 className="font-semibold text-gray-900">Retours d'expérience — REX</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {entries.length > 0 ? `${entries.length} entrée${entries.length !== 1 ? "s" : ""}` : "optionnel"}
          </p>
        </div>
        {hasChanges && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Save size={14} />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        )}
      </div>

      {toast && (
        <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="p-4 space-y-1">
        {entries.length === 0 && (
          <div className="py-6 text-center text-gray-400">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun REX pour ce poste.</p>
          </div>
        )}

        {entries.map((text, index) => (
          <div key={index} className="flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 group">
            <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
              <button onClick={() => moveUp(index)} disabled={index === 0} title="Monter"
                className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
                <ChevronUp size={14} />
              </button>
              <button onClick={() => moveDown(index)} disabled={index === entries.length - 1} title="Descendre"
                className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
                <ChevronDown size={14} />
              </button>
            </div>

            {editingIndex === index ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingIndex(null); }}
                  className="flex-1 border border-blue-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={confirmEdit} className="text-blue-600 hover:text-blue-800 text-xs font-medium">OK</button>
                <button onClick={() => setEditingIndex(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            ) : (
              <>
                <p className="flex-1 text-sm text-gray-700 leading-relaxed">{text}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => startEdit(index)} title="Modifier"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { if (confirm("Supprimer ce REX ?")) remove(index); }} title="Supprimer"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Zone d'ajout inline */}
        <div className="mt-3 flex items-start gap-2">
          <textarea
            value={addingText}
            onChange={(e) => { setAddingText(e.target.value); if (addError) setAddError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
            placeholder="Ajouter un REX… (Entrée pour valider)"
            rows={2}
            className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              addError ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap mt-0.5">
            <Plus size={14} />
            Ajouter
          </button>
        </div>
        {addError && <p className="text-xs text-red-600 pl-3">{addError}</p>}
      </div>

      {hasChanges && entries.length > 0 && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={12} />Modifications non sauvegardées</p>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors">
            <Save size={12} />
            {saving ? "Sauvegarde…" : "Sauvegarder les REX"}
          </button>
        </div>
      )}
    </div>
  );
}
