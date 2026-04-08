"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import type { Procedure } from "@/lib/types";

interface Props {
  entry: Procedure | null;
  onSave: (entry: Procedure) => void;
  onClose: () => void;
}

export default function SecteurProcedureForm({ entry, onSave, onClose }: Props) {
  const titreRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    titre:       entry?.titre       ?? "",
    description: entry?.description ?? "",
    reference:   entry?.reference   ?? "",
    critique:    entry?.critique    ?? false,
  });
  const [etapes, setEtapes] = useState<string[]>(entry?.etapes ?? []);
  const [newEtape, setNewEtape] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"titre" | "description", string>>>({});

  useEffect(() => { titreRef.current?.focus(); }, []);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === "string" && errors[field as "titre" | "description"])
      setErrors((prev) => { const next = { ...prev }; delete next[field as "titre" | "description"]; return next; });
  }

  function addEtape() {
    const t = newEtape.trim();
    if (!t) return;
    setEtapes((prev) => [...prev, t]);
    setNewEtape("");
  }

  function removeEtape(i: number) {
    setEtapes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function validate(): boolean {
    const errs: Partial<Record<"titre" | "description", string>> = {};
    if (!form.titre.trim()) errs.titre = "Le titre est obligatoire";
    if (!form.description.trim()) errs.description = "La description est obligatoire";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const filteredEtapes = etapes.filter(Boolean);
    onSave({
      titre:       form.titre.trim(),
      description: form.description.trim(),
      ...(filteredEtapes.length > 0 ? { etapes: filteredEtapes } : {}),
      ...(form.critique             ? { critique: true }          : {}),
      ...(form.reference.trim()     ? { reference: form.reference.trim() } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier la procédure" : "Ajouter une procédure"}
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
              placeholder="ex : Procédure de dérangement"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.titre ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.titre && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {errors.titre}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Détail de la procédure…"
              rows={3}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                errors.description ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {errors.description}
              </p>
            )}
          </div>

          {/* Étapes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Étapes <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            {etapes.length > 0 && (
              <ol className="space-y-1 mb-2">
                {etapes.map((etape, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-gray-700">{etape}</span>
                    <button type="button" onClick={() => removeEtape(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newEtape}
                onChange={(e) => setNewEtape(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEtape(); } }}
                placeholder="Nouvelle étape… (Entrée pour ajouter)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={addEtape}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Référence + Critique */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Référence <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => update("reference", e.target.value)}
                placeholder="ex : EIC RA DC07446"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <input
                id="critique"
                type="checkbox"
                checked={form.critique}
                onChange={(e) => update("critique", e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="critique" className="text-sm font-medium text-gray-700 cursor-pointer">
                Procédure critique
              </label>
            </div>
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
