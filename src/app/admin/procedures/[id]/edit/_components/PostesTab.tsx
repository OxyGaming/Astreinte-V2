"use client";
import type { ProcedureForm } from "@/lib/procedure/form-types";
import { Building2 } from "lucide-react";

interface Props {
  form: ProcedureForm;
  onChange: (form: ProcedureForm) => void;
  postes: { id: string; nom: string; slug: string }[];
}

export default function PostesTab({ form, onChange, postes }: Props) {
  const toggle = (posteId: string) => {
    const ids = form.posteIds.includes(posteId)
      ? form.posteIds.filter((id) => id !== posteId)
      : [...form.posteIds, posteId];
    onChange({ ...form, posteIds: ids });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Postes associés</h3>
        <p className="text-xs text-gray-400 mb-4">
          La procédure sera disponible sur les fiches de ces postes. Un poste peut avoir plusieurs procédures.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {postes.map((poste) => {
          const selected = form.posteIds.includes(poste.id);
          return (
            <label
              key={poste.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(poste.id)}
                className="text-blue-600"
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Building2 size={14} className={selected ? "text-blue-600" : "text-gray-400"} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{poste.nom}</p>
                  <p className="text-xs text-gray-400 font-mono">{poste.slug}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {postes.length === 0 && (
        <p className="text-sm text-gray-400 italic">Aucun poste enregistré.</p>
      )}
    </div>
  );
}
