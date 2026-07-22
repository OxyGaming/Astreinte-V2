"use client";

import { TextField, CheckField, TernaryField, FieldSet } from "../fields-ui";
import { GuidedFieldSet } from "../guidance-ui";
import type { StepProps } from "../types";
import type { RciPayload, Ternary } from "@/lib/rci/fields";

type K = keyof RciPayload;

/**
 * Équipement du signal : la case « présent » commande l'apparition du ternaire
 * « en service ». Tant que l'équipement n'est pas coché, demander s'il est en
 * service n'a pas de sens.
 */
function EquipRow({
  label,
  presentKey,
  serviceKey,
  variants,
  payload,
  patch,
  readOnly,
}: {
  label: string;
  presentKey: K;
  serviceKey: K;
  /** Sous-cases du type d'équipement (TVM 300/430, ETCS 1/2). */
  variants?: { label: string; key: K }[];
  payload: RciPayload;
  patch: (u: Partial<RciPayload>) => void;
  readOnly: boolean;
}) {
  const present = !!payload[presentKey];
  return (
    <div className="rounded-lg border border-slate-100 p-2.5 space-y-2">
      <div className="flex items-center gap-4 flex-wrap">
        <CheckField
          label={label}
          value={present}
          onChange={(v) => patch({ [presentKey]: v } as Partial<RciPayload>)}
          disabled={readOnly}
        />
        {present &&
          variants?.map((v) => (
            <CheckField
              key={String(v.key)}
              label={v.label}
              value={!!payload[v.key]}
              onChange={(b) => patch({ [v.key]: b } as Partial<RciPayload>)}
              disabled={readOnly}
            />
          ))}
      </div>
      {present && (
        <TernaryField
          label="En service ?"
          inline
          value={payload[serviceKey] as Ternary}
          onChange={(v) => patch({ [serviceKey]: v } as Partial<RciPayload>)}
          disabled={readOnly}
        />
      )}
    </div>
  );
}

export default function StepInstallations({
  payload,
  patch,
  readOnly,
}: StepProps) {
  return (
    <div className="space-y-4">
      <GuidedFieldSet groupId="appareil_voie" title="Appareil de voie">
        <TextField
          label="Appareil de voie (type, n°)"
          hint="(aiguille n°)"
          value={payload.appareil_voie}
          placeholder="Ex. Aiguille 21"
          disabled={readOnly}
          onChange={(v) => patch({ appareil_voie: v })}
        />
      </GuidedFieldSet>

      <GuidedFieldSet groupId="signal" title="Signal / repère">
        <TextField
          label="Signal / repère n° / EOA Km"
          value={payload.signal_repere}
          placeholder="Ex. C 212"
          disabled={readOnly}
          onChange={(v) => patch({ signal_repere: v })}
        />
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="equip_signal"
        title="Équipements du signal / repère"
        hint="cocher l'équipement, puis indiquer s'il était en service"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <EquipRow
            label="KVB / KCVP / KVBP"
            presentKey="inst_kvb"
            serviceKey="inst_kvb_en_service"
            payload={payload}
            patch={patch}
            readOnly={readOnly}
          />
          <EquipRow
            label="DAAT"
            presentKey="inst_daat"
            serviceKey="inst_daat_en_service"
            payload={payload}
            patch={patch}
            readOnly={readOnly}
          />
          <EquipRow
            label="TVM"
            presentKey="inst_tvm"
            serviceKey="inst_tvm_en_service"
            variants={[
              { label: "300", key: "inst_tvm_300" },
              { label: "430", key: "inst_tvm_430" },
            ]}
            payload={payload}
            patch={patch}
            readOnly={readOnly}
          />
          <EquipRow
            label="ETCS"
            presentKey="inst_etcs"
            serviceKey="inst_etcs_en_service"
            variants={[
              { label: "niveau 1", key: "inst_etcs_1" },
              { label: "niveau 2", key: "inst_etcs_2" },
            ]}
            payload={payload}
            patch={patch}
            readOnly={readOnly}
          />
          <EquipRow
            label="Crocodile"
            presentKey="inst_crocodile"
            serviceKey="inst_crocodile_en_service"
            payload={payload}
            patch={patch}
            readOnly={readOnly}
          />
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet
        groupId="autre_equipement"
        title="Autre équipement du signal"
        hint="emplacement libre du formulaire"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Équipement"
            hint="(hors liste ci-dessus)"
            value={payload.inst_autre_libelle}
            placeholder="Ex. ZAP, pédale…"
            disabled={readOnly}
            onChange={(v) => patch({ inst_autre_libelle: v })}
          />
          <div className="flex items-end pb-1">
            <TernaryField
              label="En service ?"
              value={payload.inst_autre_en_service}
              onChange={(v) => patch({ inst_autre_en_service: v })}
              disabled={readOnly}
            />
          </div>
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet groupId="detonateur" title="Détonateur">
        <div className="grid gap-3 sm:grid-cols-2">
          <TernaryField
            label="Équipé d'un détonateur"
            value={payload.inst_detonateur}
            onChange={(v) => patch({ inst_detonateur: v })}
            disabled={readOnly}
          />
          <TernaryField
            label="Cartouche percutée"
            value={payload.inst_cartouche_percutee}
            onChange={(v) => patch({ inst_cartouche_percutee: v })}
            disabled={readOnly}
          />
        </div>
      </GuidedFieldSet>

      <GuidedFieldSet groupId="pn" title="Passage à niveau">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="PN n°"
            value={payload.pn_numero}
            placeholder="337"
            disabled={readOnly}
            onChange={(v) => patch({ pn_numero: v })}
          />
          <div className="flex items-end gap-4 flex-wrap pb-2">
            <CheckField
              label="SAL 2"
              value={payload.pn_sal2}
              onChange={(v) => patch({ pn_sal2: v })}
              disabled={readOnly}
            />
            <CheckField
              label="SAL 4"
              value={payload.pn_sal4}
              onChange={(v) => patch({ pn_sal4: v })}
              disabled={readOnly}
            />
            <CheckField
              label="Autres"
              value={payload.pn_autres}
              onChange={(v) => patch({ pn_autres: v })}
              disabled={readOnly}
            />
          </div>
        </div>
        <TernaryField
          label="Feux routiers fonctionnent ?"
          value={payload.pn_feux_routiers}
          onChange={(v) => patch({ pn_feux_routiers: v })}
          disabled={readOnly}
        />
      </GuidedFieldSet>

      <FieldSet title="Autres installations" hint="(champ libre)">
        <TextField
          label="Autres installations"
          value={payload.autres_installations}
          disabled={readOnly}
          multiline
          rows={2}
          onChange={(v) => patch({ autres_installations: v })}
        />
      </FieldSet>
    </div>
  );
}
