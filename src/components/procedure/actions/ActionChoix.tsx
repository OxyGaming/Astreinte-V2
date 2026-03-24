"use client";

import { AlertTriangle } from "lucide-react";
import type { ActionMetier, ValeurReponse } from "@/lib/procedure/types";

interface Props {
  action: ActionMetier;
  valeur: ValeurReponse;
  onChange: (v: string) => void;
}

export default function ActionChoix({ action, valeur, onChange }: Props) {
  const options = action.reponsesDisponibles ?? [];
  const mauvaise =
    valeur !== null &&
    valeur !== undefined &&
    action.reponseAttendue !== undefined &&
    valeur !== action.reponseAttendue;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{action.label}</p>
        {action.description && (
          <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
        )}
        {action.note && (
          <p className="text-xs text-amber-600 font-medium mt-1">{action.note}</p>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              valeur === option
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {mauvaise && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">
            {action.niveau === "bloquant" ? "Bloquant — réponse" : "Alerte — réponse"} attendue :{" "}
            {String(action.reponseAttendue)}
          </p>
        </div>
      )}
    </div>
  );
}
