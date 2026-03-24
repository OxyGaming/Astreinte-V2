"use client";

import type { ActionMetier, ValeurReponse } from "@/lib/procedure/types";

interface Props {
  action: ActionMetier;
  valeur: ValeurReponse;
  onChange: (v: string) => void;
}

export default function ActionSaisieTexte({ action, valeur, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{action.label}</p>
        {action.description && (
          <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
        )}
        {action.note && (
          <p className="text-xs text-amber-600 font-medium mt-1">{action.note}</p>
        )}
      </div>
      <textarea
        value={typeof valeur === "string" ? valeur : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Votre réponse..."
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}
