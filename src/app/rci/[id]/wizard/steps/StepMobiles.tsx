"use client";

import { TextField, CheckField, TernaryField, FieldSet } from "../fields-ui";
import { GuidedFieldSet } from "../guidance-ui";
import type { StepProps } from "../types";
import type { RciPayload, Ternary } from "@/lib/rci/fields";

type K = keyof RciPayload;

/** Équipements de cabine du tableau T3 R4 — libellé + ternaire oui/non. */
const CABINE_ROWS: { label: string; key: K; variants?: { label: string; key: K }[] }[] =
  [
    { label: "KVB ou COVIT", key: "cab_kvb_covit" },
    { label: "DAAT", key: "cab_daat" },
    { label: "RST", key: "cab_rst" },
    { label: "GSM / GFU", key: "cab_gsm_gfu" },
    { label: "RS (répétition des signaux)", key: "cab_rs" },
    {
      label: "ETCS",
      key: "cab_etcs",
      variants: [
        { label: "niveau 1", key: "cab_etcs_1" },
        { label: "niveau 2", key: "cab_etcs_2" },
      ],
    },
    {
      label: "TVM",
      key: "cab_tvm",
      variants: [
        { label: "300", key: "cab_tvm_300" },
        { label: "430", key: "cab_tvm_430" },
      ],
    },
  ];

export default function StepMobiles({ payload, patch, readOnly }: StepProps) {
  return (
    <div className="space-y-4">
      <GuidedFieldSet groupId="train" title="Train / mouvement">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="N° de train"
            value={payload.train_numero}
            placeholder="6693"
            disabled={readOnly}
            onChange={(v) => patch({ train_numero: v })}
          />
          <TextField
            label="Entreprise ferroviaire"
            value={payload.train_ef}
            placeholder="SNCF Voyageurs"
            disabled={readOnly}
            onChange={(v) => patch({ train_ef: v })}
          />
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet groupId="loco" title="Engin moteur">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Locomotive / automoteur n°"
            value={payload.train_locomotive_numero}
            disabled={readOnly}
            onChange={(v) => patch({ train_locomotive_numero: v })}
          />
          <TextField
            label="Rame n°"
            value={payload.train_rame_numero}
            disabled={readOnly}
            onChange={(v) => patch({ train_rame_numero: v })}
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <CheckField
            label="US"
            value={payload.train_us}
            onChange={(v) => patch({ train_us: v })}
            disabled={readOnly}
          />
          <CheckField
            label="UM"
            value={payload.train_um}
            onChange={(v) => patch({ train_um: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Sous-traitant"
            value={payload.train_sous_traitant}
            onChange={(v) => patch({ train_sous_traitant: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Double traction"
            value={payload.train_double_traction}
            onChange={(v) => patch({ train_double_traction: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Pousse"
            value={payload.train_pousse}
            onChange={(v) => patch({ train_pousse: v })}
            disabled={readOnly}
          />
        </div>
        <TernaryField
          label="Conduite depuis engin moteur en tête du mouvement"
          value={payload.train_conduite_em_en_tete}
          onChange={(v) => patch({ train_conduite_em_en_tete: v })}
          disabled={readOnly}
        />
      </GuidedFieldSet>

      {/* Type de mouvement — le RCI papier propose ces cases en alternative au
          n° de train (manœuvres, trains de travaux, évolutions). */}
      <FieldSet
        title="Type de mouvement"
        hint="(si ce n'est pas un train commercial)"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Engin travaux n°"
            value={payload.train_engin_travaux_numero}
            disabled={readOnly}
            onChange={(v) => patch({ train_engin_travaux_numero: v })}
          />
          <TextField
            label="Train de travaux n°"
            hint="(TTx / TUS / TSV)"
            value={payload.train_type_numero}
            disabled={readOnly}
            onChange={(v) => patch({ train_type_numero: v })}
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <CheckField
            label="TTx"
            value={payload.train_type_ttx}
            onChange={(v) => patch({ train_type_ttx: v })}
            disabled={readOnly}
          />
          <CheckField
            label="TUS"
            value={payload.train_type_tus}
            onChange={(v) => patch({ train_type_tus: v })}
            disabled={readOnly}
          />
          <CheckField
            label="TSV"
            value={payload.train_type_tsv}
            onChange={(v) => patch({ train_type_tsv: v })}
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Mouvement de manœuvre guidé n°"
            value={payload.train_mouvement_manoeuvre_guide_numero}
            disabled={readOnly}
            onChange={(v) =>
              patch({ train_mouvement_manoeuvre_guide_numero: v })
            }
          />
          <TextField
            label="Mouvement de manœuvre non guidé n°"
            value={payload.train_mouvement_manoeuvre_non_guide}
            disabled={readOnly}
            onChange={(v) => patch({ train_mouvement_manoeuvre_non_guide: v })}
          />
        </div>
      </FieldSet>

      <GuidedFieldSet
        groupId="cabine"
        title="Équipements en service en cabine de conduite"
        hint="état de chaque équipement au moment de l'événement"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {CABINE_ROWS.map((row) => (
            <div
              key={String(row.key)}
              className="rounded-lg border border-slate-100 p-2.5 space-y-2"
            >
              <TernaryField
                label={row.label}
                inline
                value={payload[row.key] as Ternary}
                onChange={(v) =>
                  patch({ [row.key]: v } as Partial<RciPayload>)
                }
                disabled={readOnly}
              />
              {payload[row.key] === true && row.variants && (
                <div className="flex gap-4 flex-wrap">
                  {row.variants.map((v) => (
                    <CheckField
                      key={String(v.key)}
                      label={v.label}
                      value={!!payload[v.key]}
                      onChange={(b) =>
                        patch({ [v.key]: b } as Partial<RciPayload>)
                      }
                      disabled={readOnly}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="compo"
        title="Composition"
        hint="(masses en tonnes, longueur en mètres)"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Code / indice compo"
            value={payload.compo_code}
            disabled={readOnly}
            onChange={(v) => patch({ compo_code: v })}
          />
          <TextField
            label="Nombre de véhicules"
            value={payload.compo_nb_vehicules}
            disabled={readOnly}
            onChange={(v) => patch({ compo_nb_vehicules: v })}
          />
          <TextField
            label="Longueur (m)"
            value={payload.compo_longueur}
            disabled={readOnly}
            onChange={(v) => patch({ compo_longueur: v })}
          />
          <TextField
            label="Masse (T)"
            value={payload.compo_masse}
            disabled={readOnly}
            onChange={(v) => patch({ compo_masse: v })}
          />
          <TextField
            label="Masse freinée réalisée"
            value={payload.compo_masse_freinee_realisee}
            disabled={readOnly}
            onChange={(v) => patch({ compo_masse_freinee_realisee: v })}
          />
          <TextField
            label="Masse freinée nécessaire"
            value={payload.compo_masse_freinee_necessaire}
            disabled={readOnly}
            onChange={(v) => patch({ compo_masse_freinee_necessaire: v })}
          />
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet groupId="parcours" title="Parcours">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="De (voie, gare…)"
            value={payload.parcours_de}
            placeholder="St Étienne Châteaucreux"
            disabled={readOnly}
            onChange={(v) => patch({ parcours_de: v })}
          />
          <TextField
            label="À (voie, gare…)"
            value={payload.parcours_a}
            placeholder="Paris Gare de Lyon"
            disabled={readOnly}
            onChange={(v) => patch({ parcours_a: v })}
          />
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet groupId="vitesse" title="Vitesse">
        <TextField
          label="Vitesse au moment de l'événement (km/h)"
          hint="(selon la déclaration du conducteur)"
          value={payload.vitesse_evenement}
          placeholder="50"
          disabled={readOnly}
          onChange={(v) => patch({ vitesse_evenement: v })}
        />
      </GuidedFieldSet>

      <GuidedFieldSet groupId="vehicules" title="Véhicules accidentés">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            value={payload.veh_nombre}
            disabled={readOnly}
            onChange={(v) => patch({ veh_nombre: v })}
          />
          <TextField
            label="Numéro(s)"
            value={payload.veh_numero}
            disabled={readOnly}
            onChange={(v) => patch({ veh_numero: v })}
          />
          <TextField
            label="Masse sur rail"
            value={payload.veh_masse_rail}
            disabled={readOnly}
            onChange={(v) => patch({ veh_masse_rail: v })}
          />
          <TextField
            label="Masse freinée réalisée"
            value={payload.veh_masse_freinee_realisee}
            disabled={readOnly}
            onChange={(v) => patch({ veh_masse_freinee_realisee: v })}
          />
          <TextField
            label="Position dispositif de freinage"
            value={payload.veh_position_freinage}
            disabled={readOnly}
            onChange={(v) => patch({ veh_position_freinage: v })}
          />
          <TextField
            label="Code danger / code ONU"
            hint="(marchandises dangereuses)"
            value={payload.veh_code_danger_onu}
            disabled={readOnly}
            onChange={(v) => patch({ veh_code_danger_onu: v })}
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <CheckField
            label="Marchandise"
            value={payload.veh_marchandise}
            onChange={(v) => patch({ veh_marchandise: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Voyageur"
            value={payload.veh_voyageur}
            onChange={(v) => patch({ veh_voyageur: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Vide"
            value={payload.veh_vide}
            onChange={(v) => patch({ veh_vide: v })}
            disabled={readOnly}
          />
          <CheckField
            label="Chargé"
            value={payload.veh_charge}
            onChange={(v) => patch({ veh_charge: v })}
            disabled={readOnly}
          />
        </div>
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1">
            Tampons / attelages
          </span>
          <div className="flex gap-4 flex-wrap">
            <CheckField
              label="Circulaire"
              value={payload.veh_tampons_circulaire}
              onChange={(v) => patch({ veh_tampons_circulaire: v })}
              disabled={readOnly}
            />
            <CheckField
              label="Rectangulaire"
              value={payload.veh_tampons_rectangulaire}
              onChange={(v) => patch({ veh_tampons_rectangulaire: v })}
              disabled={readOnly}
            />
            <CheckField
              label="Autres"
              value={payload.veh_tampons_autres}
              onChange={(v) => patch({ veh_tampons_autres: v })}
              disabled={readOnly}
            />
          </div>
        </div>
        <TernaryField
          label="Serrés à refus"
          value={payload.veh_serres_refus}
          onChange={(v) => patch({ veh_serres_refus: v })}
          disabled={readOnly}
        />
      </GuidedFieldSet>

      <GuidedFieldSet groupId="relevage" title="Moyen de relevage">
        <TernaryField
          label="Besoin d'un moyen de relevage ?"
          value={payload.veh_besoin_relevage}
          onChange={(v) => patch({ veh_besoin_relevage: v })}
          disabled={readOnly}
        />
      </GuidedFieldSet>
    </div>
  );
}
