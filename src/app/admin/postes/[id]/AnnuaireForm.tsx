"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { AnnuaireEntry } from "@/lib/types";

interface Props {
  entry: AnnuaireEntry | null; // null = nouvelle entrée
  onSave: (entry: Omit<AnnuaireEntry, "ordre">) => void;
  onClose: () => void;
}

export default function AnnuaireForm({ entry, onSave, onClose }: Props) {
  const nomRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    section:   entry?.section   ?? "",
    nom:       entry?.nom       ?? "",
    fonction:  entry?.fonction  ?? "",
    telephone: entry?.telephone ?? "",
    email:     entry?.email     ?? "",
    note:      entry?.note      ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  useEffect(() => {
    nomRef.current?.focus();
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.nom.trim()) errs.nom = "Le nom est obligatoire";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Format email invalide";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      nom: form.nom.trim(),
      ...(form.section.trim()   ? { section:   form.section.trim()   } : {}),
      ...(form.fonction.trim()  ? { fonction:  form.fonction.trim()  } : {}),
      ...(form.telephone.trim() ? { telephone: form.telephone.trim() } : {}),
      ...(form.email.trim()     ? { email:     form.email.trim()     } : {}),
      ...(form.note.trim()      ? { note:      form.note.trim()      } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier l'entrée" : "Ajouter une entrée"}
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
          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Section <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={form.section}
              onChange={(e) => update("section", e.target.value)}
              placeholder="ex : Gares encadrantes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
              placeholder="ex : Jean Dupont"
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

          {/* Fonction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Fonction <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={form.fonction}
              onChange={(e) => update("fonction", e.target.value)}
              placeholder="ex : Aiguilleur chef"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => update("telephone", e.target.value)}
                placeholder="04 78 XX XX XX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="agent@sncf.fr"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
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

          {/* Actions */}
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
