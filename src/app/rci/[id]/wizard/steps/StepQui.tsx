"use client";

import { TextField, CheckField } from "../fields-ui";
import { GuidedFieldSet } from "../guidance-ui";
import type { StepProps } from "../types";
import type { RciPayload } from "@/lib/rci/fields";

type K = keyof RciPayload;

/**
 * Grille « contexte de conduite » du RCI (bloc v08+) : pour chaque situation,
 * qui assurait la fonction — agent SNCF Réseau, prestataire — et dans quel
 * contexte de conduite, avec le nom de l'intéressé.
 */
const CONDUITE_ROWS: { prefix: string; label: string }[] = [
  { prefix: "qui_conducteur_seul", label: "Conducteur seul" },
  { prefix: "qui_pilote", label: "Présence d'un pilote" },
  { prefix: "qui_pam", label: "Conducteur = PAM" },
  { prefix: "qui_ops_sol", label: "Opérations au sol" },
];

/**
 * Bloc « Qui ? » du RCI : quelles entités sont impliquées dans l'événement.
 * À ne pas confondre avec l'étape « Présents sur place », qui trace les
 * personnes avisées et leur heure d'arrivée.
 */
export default function StepQui({ payload, patch, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <GuidedFieldSet groupId="sgc" title="SNCF Réseau">
        <div className="flex gap-5 flex-wrap">
          <CheckField
            label="SGC"
            value={payload.qui_sgc}
            onChange={(v) => patch({ qui_sgc: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Maintenance et Travaux (activité mainteneur)"
            value={payload.qui_maintenance_travaux_mainteneur}
            onChange={(v) =>
              patch({ qui_maintenance_travaux_mainteneur: v })
            }
            disabled={readOnly}
          />
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="nb_cabine"
        title="Personnel en cabine"
        hint="version v08+ du RCI"
      >
        <TextField
          label="Nombre de personnes en cabine de conduite"
          value={payload.qui_nb_personnes_cabine}
          placeholder="1"
          disabled={readOnly}
          onChange={(v) => patch({ qui_nb_personnes_cabine: v })}
        />
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="contexte_conduite"
        title="Contexte de conduite"
        hint="qui assurait la fonction, et à quel titre"
      >
        <div className="space-y-2">
          {CONDUITE_ROWS.map((row) => {
            const reseau = `${row.prefix}_reseau` as K;
            const prestataire = `${row.prefix}_prestataire` as K;
            const conduite = `${row.prefix}_conduite` as K;
            const nom = `${row.prefix}_nom` as K;
            return (
              <div
                key={row.prefix}
                className="rounded-lg border border-slate-100 p-3 space-y-2"
              >
                <span className="block text-xs font-semibold text-slate-700">
                  {row.label}
                </span>
                <div className="flex gap-4 flex-wrap">
                  <CheckField
                    label="Réseau"
                    value={!!payload[reseau]}
                    onChange={(v) => patch({ [reseau]: v } as Partial<RciPayload>)}
                    disabled={readOnly}
                  />
                  <CheckField
                    label="Prestataire"
                    value={!!payload[prestataire]}
                    onChange={(v) =>
                      patch({ [prestataire]: v } as Partial<RciPayload>)
                    }
                    disabled={readOnly}
                  />
                  <CheckField
                    label="Conduite (préciser le contexte)"
                    value={!!payload[conduite]}
                    onChange={(v) =>
                      patch({ [conduite]: v } as Partial<RciPayload>)
                    }
                    disabled={readOnly}
                  />
                </div>
                <TextField
                  label="Nom"
                  value={payload[nom] as string}
                  disabled={readOnly}
                  onChange={(v) => patch({ [nom]: v } as Partial<RciPayload>)}
                />
              </div>
            );
          })}
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet groupId="ef1" title="EF n°1">
        <TextField
          label="Nom de l'entreprise ferroviaire"
          value={payload.ef1_nom}
          disabled={readOnly}
          onChange={(v) => patch({ ef1_nom: v })}
        />
        <div className="flex gap-5 flex-wrap">
          <CheckField
            label="Travaille pour elle-même"
            value={payload.ef1_pour_elle_meme}
            onChange={(v) => patch({ ef1_pour_elle_meme: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Travaille en tant que sous-traitant"
            value={payload.ef1_sous_traitant}
            onChange={(v) => patch({ ef1_sous_traitant: v })}
            disabled={readOnly}
          />
        </div>
        {payload.ef1_sous_traitant && (
          <TextField
            label="Nom de l'EF utilisatrice"
            value={payload.ef1_utilisatrice_nom}
            disabled={readOnly}
            onChange={(v) => patch({ ef1_utilisatrice_nom: v })}
          />
        )}
      </GuidedFieldSet>

      <GuidedFieldSet groupId="autres_gi" title="Autres GI ou délégataires">
        <TextField
          label="Nom"
          value={payload.autres_gi_nom}
          disabled={readOnly}
          onChange={(v) => patch({ autres_gi_nom: v })}
        />
        <div className="space-y-2">
          <CheckField
            label="Délégataire titulaire d'une convention pour le compte de SNCF Réseau"
            value={payload.autres_gi_delegataire}
            onChange={(v) => patch({ autres_gi_delegataire: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Titulaire d'un contrat / marché de partenariat, concession ou délégation de service public"
            value={payload.autres_gi_titulaire}
            onChange={(v) => patch({ autres_gi_titulaire: v })}
            disabled={readOnly}
          />
        </div>
      </GuidedFieldSet>

      {/* Le modèle Word ne comporte pas de bloc « Qui ? EF n°2 » : la 2e EF se
          saisit dans « Présents sur place » et dans le tableau des signatures.
          On le dit ici plutôt que de laisser l'utilisateur chercher le champ. */}
      <p className="text-[11px] text-slate-500 italic px-1">
        Une 2ᵉ entreprise ferroviaire se renseigne à l&apos;étape « Présents sur
        place » (ligne EF n°2) et dans le tableau des signatures : le modèle
        officiel n&apos;a pas de bloc « Qui ? » dédié à l&apos;EF n°2.
      </p>
    </div>
  );
}
