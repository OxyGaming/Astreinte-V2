"use client";

import { TextField } from "../fields-ui";
import { GuidedFieldSet } from "../guidance-ui";
import {
  RCI_EVENT_TYPES,
  RCI_EVENT_TYPE_HINTS,
  RCI_EVENT_TYPE_LABELS,
  normalizeEventType,
} from "@/lib/rci/guidance";
import type { StepProps } from "../types";

export default function Step2Nature({ payload, patch, readOnly }: StepProps) {
  const current = normalizeEventType(payload.event_type);

  return (
    <div className="space-y-4">
      {/* Le choix de la typologie pilote tout le guidage du wizard : c'est la
          première chose à trancher, avant même la rédaction du « Quoi ? ». */}
      <fieldset className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-3">
        <legend className="px-2">
          <span className="text-xs font-semibold text-slate-700">
            Type d&apos;événement
          </span>
          <span className="ml-2 text-[10px] font-normal font-mono text-slate-500">
            adapte les champs attendus
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {RCI_EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch({ event_type: t })}
              disabled={readOnly}
              aria-pressed={current === t}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                current === t
                  ? "bg-blue-800 text-white border-blue-800 font-semibold"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
              }`}
            >
              {RCI_EVENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-600">
          {RCI_EVENT_TYPE_HINTS[current]} — les rubriques du RCI s&apos;affichent
          ensuite en <span className="font-semibold text-rose-700">obligatoire</span>,{" "}
          <span className="font-semibold text-amber-700">selon le cas</span> ou{" "}
          <span className="font-semibold text-slate-500">sans objet</span>. Rien
          n&apos;est verrouillé : une rubrique repliée reste saisissable.
        </p>
      </fieldset>

      <GuidedFieldSet
        groupId="nature"
        title="Nature de l'événement"
        hint="Décrit en quelques mots ce qui s'est passé"
      >
        <TextField
          label="Quoi ?"
          hint="(déraillement, talonnage, franchissement, accident de personne, collision, PN…)"
          value={payload.nature}
          placeholder="Ex. Heurt d'un véhicule au PN 337 par le train 6693"
          disabled={readOnly}
          multiline
          rows={3}
          onChange={(v) => patch({ nature: v })}
        />
      </GuidedFieldSet>
    </div>
  );
}
