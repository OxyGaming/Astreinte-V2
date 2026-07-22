"use client";

import { TernaryField, TextField, TimeField } from "../fields-ui";
import { GuidedFieldSet } from "../guidance-ui";
import type { StepProps } from "../types";
import type { RciPayload } from "@/lib/rci/fields";

type K = keyof RciPayload;

export default function StepMesures({ payload, patch, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <GuidedFieldSet groupId="alcool" title="Alcoolémie">
        <TextField
          label="Personne concernée"
          value={payload.alcool_personne}
          placeholder="Ex. AC + conducteur"
          disabled={readOnly}
          onChange={(v) => patch({ alcool_personne: v })}
        />
        <TernaryField
          label="Dépistage pratiqué"
          value={payload.alcool_pratique}
          onChange={(v) => patch({ alcool_pratique: v })}
          disabled={readOnly}
        />
      </GuidedFieldSet>

      <GuidedFieldSet groupId="alcool_positif" title="Résultat du dépistage">
        <TernaryField
          label="Résultat positif ?"
          value={payload.alcool_positif}
          onChange={(v) => patch({ alcool_positif: v })}
          disabled={readOnly}
        />
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="accident_personne"
        title="Accident de personnes / personnel"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <TernaryField
            label="Blessé"
            value={payload.ap_blesse}
            onChange={(v) => patch({ ap_blesse: v })}
            disabled={readOnly}
          />
          <TernaryField
            label="Décès"
            value={payload.ap_deces}
            onChange={(v) => patch({ ap_deces: v })}
            disabled={readOnly}
          />
          <TernaryField
            label="Suicide présumé"
            value={payload.ap_suicide_presume}
            onChange={(v) => patch({ ap_suicide_presume: v })}
            disabled={readOnly}
          />
        </div>
        <TextField
          label="Source"
          value={payload.ap_source}
          placeholder="Pompiers, OPJ, témoin…"
          disabled={readOnly}
          onChange={(v) => patch({ ap_source: v })}
        />
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="mesures_conservatoires"
        title="Mesures conservatoires"
        hint="3 lignes max"
      >
        {[1, 2, 3].map((i) => {
          const heureKey = `mc_l${i}_heure` as K;
          const parKey = `mc_l${i}_par_qui` as K;
          const mesKey = `mc_l${i}_mesures` as K;
          return (
            // Colonnes en `minmax(0,…)` : sans borne basse à 0, l'input `time`
            // impose sa largeur intrinsèque et pousse les colonnes voisines
            // hors de la carte (les champs se chevauchaient).
            <div
              key={i}
              className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,1.6fr)]"
            >
              <TimeField
                label={`Heure ${i}`}
                value={payload[heureKey] as string}
                disabled={readOnly}
                onChange={(v) => patch({ [heureKey]: v } as Partial<RciPayload>)}
              />
              <TextField
                label="Par qui ?"
                value={payload[parKey] as string}
                disabled={readOnly}
                onChange={(v) => patch({ [parKey]: v } as Partial<RciPayload>)}
              />
              <TextField
                label="Quelles mesures ?"
                value={payload[mesKey] as string}
                disabled={readOnly}
                onChange={(v) => patch({ [mesKey]: v } as Partial<RciPayload>)}
              />
            </div>
          );
        })}

        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <TimeField
            label="Notification écrite à"
            value={payload.mc_notification_heure}
            disabled={readOnly}
            onChange={(v) => patch({ mc_notification_heure: v })}
          />
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Réalisée par
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {/* Exclusifs : la notification est faite soit par le dirigeant
                  d'enquête, soit par le COGC — jamais les deux. */}
              <button
                type="button"
                disabled={readOnly}
                aria-pressed={payload.mc_notification_dpx}
                onClick={() =>
                  patch({
                    mc_notification_dpx: !payload.mc_notification_dpx,
                    mc_notification_cogc: false,
                  })
                }
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                  payload.mc_notification_dpx
                    ? "bg-blue-800 border-blue-800 text-white font-semibold"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                Dirigeant d&apos;enquête
              </button>
              <button
                type="button"
                disabled={readOnly}
                aria-pressed={payload.mc_notification_cogc}
                onClick={() =>
                  patch({
                    mc_notification_cogc: !payload.mc_notification_cogc,
                    mc_notification_dpx: false,
                  })
                }
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                  payload.mc_notification_cogc
                    ? "bg-blue-800 border-blue-800 text-white font-semibold"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                COGC (DRC)
              </button>
            </div>
          </div>
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="acteurs"
        title="Identification des acteurs principaux"
        hint="3 lignes max"
      >
        {[1, 2, 3].map((i) => {
          const eKey = `acteur_l${i}_entreprise` as K;
          const nKey = `acteur_l${i}_nom` as K;
          const fKey = `acteur_l${i}_fonction` as K;
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <TextField
                label={`Entreprise ${i}`}
                value={payload[eKey] as string}
                disabled={readOnly}
                onChange={(v) => patch({ [eKey]: v } as Partial<RciPayload>)}
              />
              <TextField
                label="Nom (facultatif)"
                value={payload[nKey] as string}
                disabled={readOnly}
                onChange={(v) => patch({ [nKey]: v } as Partial<RciPayload>)}
              />
              <TextField
                label="Fonction"
                value={payload[fKey] as string}
                disabled={readOnly}
                onChange={(v) => patch({ [fKey]: v } as Partial<RciPayload>)}
              />
            </div>
          );
        })}
      </GuidedFieldSet>
    </div>
  );
}
