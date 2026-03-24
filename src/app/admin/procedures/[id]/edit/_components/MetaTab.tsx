"use client";
import { slugify } from "@/lib/procedure/form-types";
import { TYPE_PROCEDURE_OPTIONS } from "@/lib/procedure/form-types";
import type { ProcedureForm } from "@/lib/procedure/form-types";

interface Props {
  form: ProcedureForm;
  onChange: (form: ProcedureForm) => void;
}

export default function MetaTab({ form, onChange }: Props) {
  const set = (key: keyof ProcedureForm, value: unknown) =>
    onChange({ ...form, [key]: value });

  const handleTitreChange = (titre: string) => {
    // Auto-compute slug only if it's empty or was previously auto-derived
    const autoSlug = form.id ? form.slug : slugify(titre);
    onChange({ ...form, titre, slug: form.slug === slugify(form.titre) ? autoSlug : form.slug });
  };

  return (
    <div className="space-y-5">
      {/* Titre */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre *</label>
        <input
          type="text"
          value={form.titre}
          onChange={(e) => handleTitreChange(e.target.value)}
          placeholder="Ex : Cessation de service — Givors Ville"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Slug <span className="font-normal text-gray-400">(identifiant URL, unique)</span>
        </label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => set("slug", slugify(e.target.value) || e.target.value)}
          placeholder="cessation-givors-ville"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Minuscules, chiffres et tirets uniquement. Auto-généré depuis le titre.</p>
      </div>

      {/* Type + Version */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type de procédure *</label>
          <select
            value={form.typeProcedure}
            onChange={(e) => set("typeProcedure", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TYPE_PROCEDURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Version</label>
          <input
            type="text"
            value={form.version}
            onChange={(e) => set("version", e.target.value)}
            placeholder="1.0"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="font-normal text-gray-400">(optionnelle)</span></label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="Décrivez brièvement l'objectif et le contexte de cette procédure…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
