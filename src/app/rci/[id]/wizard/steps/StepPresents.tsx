"use client";

import { TernaryField, TimeField } from "../fields-ui";
import { GuidedFieldSet } from "../guidance-ui";
import type { StepProps } from "../types";
import type { RciPayload, Ternary } from "@/lib/rci/fields";

type K = keyof RciPayload;

type RoleRow = {
  key: string;
  label: string;
  /** Si truthy, on rend un input libre à côté du label (cas « Autres »). */
  labelEditableKey?: K;
};

const SECTIONS: { groupId: string; title: string; rows: RoleRow[] }[] = [
  {
    groupId: "po_reseau",
    title: "Représentants de SNCF Réseau",
    rows: [
      { key: "dpx", label: "Dirigeant de proximité ou astreinte Circulation" },
      { key: "utm", label: "Dirigeant d'UTM (ou son délégataire) ou astreinte" },
      { key: "reg", label: "Régulateur sous-station" },
    ],
  },
  {
    groupId: "po_externes",
    title: "Intervenants externes",
    rows: [
      { key: "police", label: "Police ou Gendarmerie" },
      { key: "pompiers", label: "Pompiers" },
      { key: "funebres", label: "Pompes funèbres" },
      {
        key: "autres",
        label: "Autres",
        labelEditableKey: "po_autres_label",
      },
    ],
  },
  {
    groupId: "po_exploitants",
    title: "Représentants des exploitants",
    rows: [
      { key: "ef1", label: "EF n°1" },
      { key: "ef2", label: "EF n°2" },
      { key: "convois", label: "Convois du GI" },
    ],
  },
  {
    groupId: "po_suge",
    title: "Sûreté ferroviaire",
    rows: [{ key: "suge", label: "Représentant Direction Zonale Sûreté (SUGE)" }],
  },
  {
    groupId: "po_autres_gi",
    title: "Représentants des autres GI",
    rows: [
      { key: "titulaire", label: "Titulaire du contrat" },
      { key: "delegataire", label: "Délégataire pour SNCF Réseau" },
    ],
  },
];

export default function StepPresents({ payload, patch, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((s) => (
        <GuidedFieldSet key={s.groupId} groupId={s.groupId} title={s.title}>
          <div className="space-y-3">
            {s.rows.map((r) => {
              const heureAvisKey = `po_${r.key}_heure_avis` as K;
              const presentKey = `po_${r.key}_present` as K;
              const heureArriveeKey = `po_${r.key}_heure_arrivee` as K;
              return (
                // Une carte par rôle plutôt qu'une ligne de tableau : à 4
                // colonnes fixes, l'heure et le toggle se chevauchaient dès que
                // la fenêtre se resserrait. Ici chaque bloc se réagence seul.
                <div
                  key={r.key}
                  className="rounded-lg border border-slate-100 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700">
                      {r.label}
                    </span>
                    {r.labelEditableKey && (
                      <input
                        type="text"
                        value={payload[r.labelEditableKey] as string}
                        onChange={(e) =>
                          patch({
                            [r.labelEditableKey!]: e.target.value,
                          } as Partial<RciPayload>)
                        }
                        disabled={readOnly}
                        placeholder="à préciser"
                        aria-label="Autres intervenants — préciser"
                        className="input py-1 text-xs w-40"
                      />
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
                    <TimeField
                      label="Heure d'avis"
                      value={payload[heureAvisKey] as string}
                      disabled={readOnly}
                      onChange={(v) =>
                        patch({ [heureAvisKey]: v } as Partial<RciPayload>)
                      }
                    />
                    <div className="pb-2">
                      <TernaryField
                        label="Présent sur place ?"
                        inline
                        value={payload[presentKey] as Ternary}
                        onChange={(v) =>
                          patch({ [presentKey]: v } as Partial<RciPayload>)
                        }
                        disabled={readOnly}
                      />
                    </div>
                    <TimeField
                      label="Heure d'arrivée"
                      value={payload[heureArriveeKey] as string}
                      disabled={readOnly}
                      onChange={(v) =>
                        patch({ [heureArriveeKey]: v } as Partial<RciPayload>)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GuidedFieldSet>
      ))}
    </div>
  );
}
