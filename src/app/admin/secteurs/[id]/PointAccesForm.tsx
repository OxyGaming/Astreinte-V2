"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { PointAcces } from "@/lib/types";

interface Props {
  entry: PointAcces | null;
  onSave: (entry: PointAcces) => void;
  onClose: () => void;
}

export default function PointAccesForm({ entry, onSave, onClose }: Props) {
  const nomRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nom:       entry?.nom       ?? "",
    adresse:   entry?.adresse   ?? "",
    gps:       entry?.gps       ?? "",
    code:      entry?.code      ?? "",
    reference: entry?.reference ?? "",
    note:      entry?.note      ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  useEffect(() => { nomRef.current?.focus(); }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.nom.trim()) errs.nom = "Le nom est obligatoire";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      nom: form.nom.trim(),
      ...(form.adresse.trim()   ? { adresse:   form.adresse.trim()   } : {}),
      ...(form.gps.trim()       ? { gps:       form.gps.trim()       } : {}),
      ...(form.code.trim()      ? { code:       form.code.trim()      } : {}),
      ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
      ...(form.note.trim()      ? { note:       form.note.trim()      } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier le point d'accès" : "Ajouter un point d'accès"}
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
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              ref={nomRef}
              type="text"
              value={form.nom}
              onChange={(e) => update("nom", e.target.value)}
              placeholder="ex : Passage à niveau de Chasse-sur-Rhône"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nom ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.nom && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {errors.nom}
              </p>
            )}
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={form.adresse}
              onChange={(e) => update("adresse", e.target.value)}
              placeholder="ex : Route de Lyon, 38670 Chasse-sur-Rhône"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* GPS + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Coordonnées GPS <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.gps}
                onChange={(e) => update("gps", e.target.value)}
                placeholder="45.3456, 4.7890"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Code d'accès <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => update("code", e.target.value)}
                placeholder="ex : 1234A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Référence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Référence <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => update("reference", e.target.value)}
              placeholder="ex : Plan de situation n°12"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
