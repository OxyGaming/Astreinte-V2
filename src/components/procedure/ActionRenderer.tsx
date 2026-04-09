"use client";

import type { ActionMetier, ValeurReponse } from "@/lib/procedure/types";
import type { Contact } from "@/lib/types";
import ActionInformation from "./actions/ActionInformation";
import ActionOuiNon from "./actions/ActionOuiNon";
import ActionChoix from "./actions/ActionChoix";
import ActionSaisieTexte from "./actions/ActionSaisieTexte";
import ActionConfirmation from "./actions/ActionConfirmation";
import ActionContactRecherche from "./actions/ActionContactRecherche";

interface Props {
  action: ActionMetier;
  valeur: ValeurReponse;
  onChange: (v: ValeurReponse) => void;
  /** Téléphone résolu depuis le contactId (passé par EtapeRenderer, pour confirmation) */
  contactTelephone?: string;
  /** Liste complète des contacts (pour contact_recherche) */
  allContacts?: Contact[];
}

/**
 * Dispatch vers le bon composant selon `action.type`.
 * Enrichissements UI :
 * - contactId       → passe contactTelephone à ActionConfirmation
 * - referenceDoc    → affiché dans ActionConfirmation
 * - contact_recherche → passe allContacts à ActionContactRecherche
 */
export default function ActionRenderer({
  action,
  valeur,
  onChange,
  contactTelephone,
  allContacts = [],
}: Props) {
  switch (action.type) {
    case "information":
      return <ActionInformation action={action} />;

    case "question_oui_non":
      return (
        <ActionOuiNon
          action={action}
          valeur={valeur}
          onChange={(v) => onChange(v)}
        />
      );

    case "question_choix":
      return (
        <ActionChoix
          action={action}
          valeur={valeur}
          onChange={(v) => onChange(v)}
        />
      );

    case "saisie_texte":
      return (
        <ActionSaisieTexte
          action={action}
          valeur={valeur}
          onChange={(v) => onChange(v)}
        />
      );

    case "confirmation":
      return (
        <ActionConfirmation
          action={action}
          valeur={valeur}
          onChange={(v) => onChange(v)}
          contactTelephone={contactTelephone}
        />
      );

    case "contact_recherche":
      return (
        <ActionContactRecherche
          action={action}
          valeur={valeur}
          onChange={(v) => onChange(v)}
          allContacts={allContacts}
        />
      );

    default:
      return (
        <div className="text-xs text-slate-400 px-3 py-2 bg-slate-50 rounded-lg">
          Type d&apos;action inconnu : {(action as ActionMetier).type}
        </div>
      );
  }
}
