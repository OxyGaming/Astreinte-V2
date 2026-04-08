"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { CircuitVoie } from "@/lib/types";

interface Props {
  entry: CircuitVoie | null;
  onSave: (entry: CircuitVoie) => void;
  onClose: () => void;
}

export default function CircuitVoieForm({ entry, onSave, onClose }: Props) {
  const designationRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    designation: entry?.designation ?? "",
    voie:        entry?.voie        ?? "",
    delai_max:   entry?.delai_max   ?? "",
    note:        entry?.note        ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  useEffect(() => { designationRef.current?.focus(); }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.designation.trim()) errs.designation = "La désignation est obligatoire";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      designation: form.designation.trim(),
      ...(form.voie.trim()      ? { voie:      form.voie.trim()      } : {}),
      ...(form.delai_max.trim() ? { delai_max: form.delai_max.trim() } : {}),
      ...(form.note.trim()      ? { note:      form.note.trim()      } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier le circuit de voie" : "Ajouter un circuit de voie"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Désignation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Désignation <span className="text-red-500">*</span>
            </label>
            <input
              ref={designationRef}
              type="text"
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              placeholder="ex : CDV 340A"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.designation ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.designation && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {errors.designation}
              </p>
            )}
          </div>

          {/* Voie + Délai max */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Voie <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.voie}
                onChange={(e) => update("voie", e.target.value)}
                placeholder="ex : Voie 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Délai max <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.delai_max}
                onChange={(e) => update("delai_max", e.target.value)}
                placeholder="ex : 72h"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="Informations complémentaires…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {entry ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
