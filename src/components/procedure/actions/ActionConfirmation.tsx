"use client";

import { CheckSquare, Square } from "lucide-react";
import type { ActionMetier, ValeurReponse } from "@/lib/procedure/types";
import PhoneButton from "@/components/PhoneButton";

interface Props {
  action: ActionMetier;
  valeur: ValeurReponse;
  onChange: (v: boolean) => void;
  contactTelephone?: string;
}

export default function ActionConfirmation({ action, valeur, onChange, contactTelephone }: Props) {
  const checked = valeur === true;

  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
        checked
          ? "border-green-500 bg-green-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {checked ? (
          <CheckSquare size={20} className="text-green-600" />
        ) : (
          <Square size={20} className="text-slate-400" />
        )}
      </div>
      <div className="space-y-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${checked ? "text-green-900" : "text-slate-900"}`}>
          {action.label}
        </p>
        {action.description && (
          <p className="text-xs text-slate-500">{action.description}</p>
        )}
        {action.note && (
          <p className="text-xs text-amber-600 font-medium">{action.note}</p>
        )}
        {action.referenceDoc && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
            {action.referenceDoc}
          </span>
        )}
        {contactTelephone && !checked && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <PhoneButton number={contactTelephone} size="sm" />
          </div>
        )}
      </div>
    </button>
  );
}
