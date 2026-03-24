"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { ActionMetier, ValeurReponse } from "@/lib/procedure/types";

interface Props {
  action: ActionMetier;
  valeur: ValeurReponse;
  onChange: (v: boolean) => void;
}

export default function ActionOuiNon({ action, valeur, onChange }: Props) {
  const repondu = valeur !== null && valeur !== undefined;
  const mauvaise =
    repondu &&
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

      <div className="flex gap-3">
        <button
          onClick={() => onChange(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
            valeur === true
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50"
          }`}
        >
          <CheckCircle2 size={18} />
          Oui
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
            valeur === false
              ? "border-red-400 bg-red-50 text-red-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50"
          }`}
        >
          <XCircle size={18} />
          Non
        </button>
      </div>

      {mauvaise && action.niveau === "bloquant" && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-red-600" />
          <p className="text-xs text-red-700 font-medium">
            Réponse attendue : {action.reponseAttendue ? "Oui" : "Non"} — cette réponse bloque la cessation.
          </p>
        </div>
      )}
      {mauvaise && action.niveau === "alerte" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">
            Point d&apos;alerte — réponse attendue : {action.reponseAttendue ? "Oui" : "Non"}.
          </p>
        </div>
      )}
    </div>
  );
}
