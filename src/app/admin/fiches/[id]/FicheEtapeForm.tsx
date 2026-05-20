"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import type { Etape } from "@/lib/types";

interface Props {
  entry: Etape | null;
  onSave: (entry: Etape) => void;
  onClose: () => void;
}

export default function FicheEtapeForm({ entry, onSave, onClose }: Props) {
  const titreRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    titre:       entry?.titre       ?? "",
    description: entry?.description ?? "",
    critique:    entry?.critique    ?? false,
  });
  const [actions, setActions] = useState<string[]>(entry?.actions ?? []);
  const [newAction, setNewAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { titreRef.current?.focus(); }, []);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "titre" && error) setError(null);
  }

  function addAction() {
    const t = newAction.trim();
    if (!t) return;
    setActions((prev) => [...prev, t]);
    setNewAction("");
  }

  function removeAction(i: number) {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre.trim()) {
      setError("Le titre est obligatoire");
      return;
    }
    const filteredActions = actions.map((a) => a.trim()).filter(Boolean);
    onSave({
      ordre: entry?.ordre ?? 0,
      titre: form.titre.trim(),
      description: form.description.trim(),
      ...(filteredActions.length > 0 ? { actions: filteredActions } : {}),
      ...(form.critique ? { critique: true } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier l'étape" : "Ajouter une étape"}
          </h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              ref={titreRef}
              type="text"
              value={form.titre}
              onChange={(e) => update("titre", e.target.value)}
              placeholder="ex : Sécuriser les lieux"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {error && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {error}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Détail de l'étape…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Actions <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            {actions.length > 0 && (
              <ul className="space-y-1 mb-2">
                {actions.map((action, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-gray-700">{action}</span>
                    <button type="button" onClick={() => removeAction(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAction(); } }}
                placeholder="Nouvelle action… (Entrée pour ajouter)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={addAction}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Critique */}
          <div className="flex items-center gap-2">
            <input
              id="etape-critique"
              type="checkbox"
              checked={form.critique}
              onChange={(e) => update("critique", e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="etape-critique" className="text-sm font-medium text-gray-700 cursor-pointer">
              Étape critique
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              {entry ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
