"use client";

import type { EtapeMetier, EtatEtape, ValeurReponse } from "@/lib/procedure/types";
import { actionsVisibles, etapeFranchissable } from "@/lib/procedure/engine";
import type { EtatSession } from "@/lib/procedure/types";
import type { Contact, Lien } from "@/lib/types";
import { resolveLienRefs } from "@/lib/liens";
import ActionRenderer from "./ActionRenderer";
import { AlertTriangle, ChevronRight, ChevronLeft, Link2, ExternalLink } from "lucide-react";

interface Props {
  etape: EtapeMetier;
  etatEtape: EtatEtape | undefined;
  etat: EtatSession;
  estDerniere: boolean;
  onRepondre: (actionId: string, valeur: ValeurReponse) => void;
  onSuivant: () => void;
  onPrecedent: () => void;
  onTerminer: () => void;
  /** Map contactId → telephone (enrichissement confirmation) */
  contactsIndex: Record<string, string>;
  /** Liste complète des contacts (pour les actions contact_recherche) */
  allContacts?: Contact[];
  /** Collection de liens (résolution des liens d'étape) */
  liensCollection?: Lien[];
}

export default function EtapeRenderer({
  etape, etatEtape, etat, estDerniere,
  onRepondre, onSuivant, onPrecedent, onTerminer, contactsIndex, allContacts = [], liensCollection = [],
}: Props) {
  const actions = actionsVisibles(etape, etat);
  const etapeLiens = resolveLienRefs(etape.liens ?? [], liensCollection);
  const { ok, actionsBloques } = etapeFranchissable(etape, etat);

  return (
    <div className="space-y-4">
      {/* En-tête étape */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">{etape.titre}</h2>
        {etape.description && (
          <p className="text-sm text-slate-500 mt-0.5">{etape.description}</p>
        )}
      </div>

      {/* Liens utiles de l'étape */}
      {etapeLiens.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Link2 size={12} />
            Liens utiles
          </p>
          <div className="space-y-1.5">
            {etapeLiens.map((lien, i) =>
              lien.orphan || !lien.url ? (
                <p key={i} className="text-xs text-slate-400">{lien.libelle} — indisponible</p>
              ) : (
                <a
                  key={i}
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
                >
                  <ExternalLink size={13} className="flex-shrink-0" />
                  {lien.libelle}
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {actions.map((action) => {
          const valeur = etatEtape?.reponses[action.id]?.valeur ?? null;
          const estBloque = actionsBloques.includes(action.id);

          return (
            <div
              key={action.id}
              className={`rounded-xl border bg-white p-4 ${
                estBloque
                  ? "border-red-300 ring-1 ring-red-200"
                  : "border-slate-200"
              }`}
            >
              <ActionRenderer
                action={action}
                valeur={valeur}
                onChange={(v) => onRepondre(action.id, v)}
                contactTelephone={action.contactId ? contactsIndex[action.contactId] : undefined}
                allContacts={allContacts}
              />
            </div>
          );
        })}
      </div>

      {/* Avertissement si étape non franchissable */}
      {!ok && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-700 font-medium">
            {actionsBloques.length} action{actionsBloques.length > 1 ? "s" : ""} en attente ou bloquante{actionsBloques.length > 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onPrecedent}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
          Précédent
        </button>

        {estDerniere ? (
          <button
            onClick={onTerminer}
            disabled={!ok}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-colors ${
              ok
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Valider la procédure
          </button>
        ) : (
          <button
            onClick={onSuivant}
            disabled={!ok}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-colors ${
              ok
                ? "bg-blue-700 hover:bg-blue-800 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Suivant
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
