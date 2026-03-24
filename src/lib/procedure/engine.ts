/**
 * Moteur d'exécution des procédures métier.
 * Module pur (pas d'I/O, pas de React) — testable indépendamment.
 *
 * Priorité de synthèse : impossible > incomplet > alerte > possible
 */

import type {
  ProcedureMetier,
  EtapeMetier,
  ActionMetier,
  EtatSession,
  EtatEtape,
  ReponseAction,
  ValeurReponse,
  Synthese,
  StatutSynthese,
  ElementBlocage,
  ElementAlerte,
  ConditionExpr,
} from "./types";

// ─── Aplatissement des réponses ───────────────────────────────────────────────

/**
 * Collecte toutes les réponses de toutes les étapes dans une map plate.
 * Utilisé pour l'évaluation des conditions (qui référencent des actionId globaux).
 */
export function reponsesAplaties(
  etat: EtatSession
): Record<string, ReponseAction> {
  const acc: Record<string, ReponseAction> = {};
  for (const etatEtape of Object.values(etat.etapes)) {
    Object.assign(acc, etatEtape.reponses);
  }
  return acc;
}

// ─── Évaluation de conditions ─────────────────────────────────────────────────
//
// V1-safe : si aucune conditionAffichage n'est définie, le résultat est toujours
// true (tout est visible). Les conditions présentes dans le JSON sont évaluées
// correctement dès V1 si besoin.

export function evalCondition(
  expr: ConditionExpr,
  reponses: Record<string, ReponseAction>
): boolean {
  if ("logique" in expr) {
    const results = expr.conditions.map((c) => evalCondition(c, reponses));
    return expr.logique === "AND" ? results.every(Boolean) : results.some(Boolean);
  }

  const val = reponses[expr.actionId]?.valeur;

  switch (expr.operateur) {
    case "eq":
      return val === expr.valeur;
    case "neq":
      return val !== expr.valeur;
    case "in":
      return Array.isArray(expr.valeur) && expr.valeur.includes(val as string);
    case "exists":
      return val !== null && val !== undefined;
    case "not_exists":
      return val === null || val === undefined;
    default:
      return false;
  }
}

// ─── Résolution des étapes/actions visibles ───────────────────────────────────

export function etapesVisibles(
  procedure: ProcedureMetier,
  etat: EtatSession
): EtapeMetier[] {
  const reponses = reponsesAplaties(etat);
  return [...procedure.etapes]
    .sort((a, b) => a.ordre - b.ordre)
    .filter(
      (etape) =>
        !etape.conditionAffichage ||
        evalCondition(etape.conditionAffichage, reponses)
    );
}

export function actionsVisibles(
  etape: EtapeMetier,
  etat: EtatSession
): ActionMetier[] {
  const reponses = reponsesAplaties(etat);
  return etape.actions.filter(
    (action) =>
      !action.conditionAffichage ||
      evalCondition(action.conditionAffichage, reponses)
  );
}

// ─── Franchissement d'étape ───────────────────────────────────────────────────

export interface ResultatFranchissement {
  ok: boolean;
  actionsBloques: string[]; // IDs des actions qui bloquent le passage
}

/**
 * Une étape est franchissable si :
 * 1. Toutes ses actions obligatoires ont une réponse
 * 2. Aucune action bloquante n'a une réponse incorrecte
 */
export function etapeFranchissable(
  etape: EtapeMetier,
  etat: EtatSession
): ResultatFranchissement {
  const etatEtape = etat.etapes[etape.id];
  const actionsBloques: string[] = [];
  const actions = actionsVisibles(etape, etat);

  for (const action of actions) {
    const valeur = etatEtape?.reponses[action.id]?.valeur;
    const repondu = valeur !== null && valeur !== undefined;

    // Action obligatoire non répondue
    if (action.obligatoire && !repondu) {
      actionsBloques.push(action.id);
      continue;
    }

    // Action bloquante avec mauvaise réponse
    if (
      repondu &&
      action.niveau === "bloquant" &&
      action.reponseAttendue !== undefined &&
      valeur !== action.reponseAttendue
    ) {
      actionsBloques.push(action.id);
    }
  }

  return { ok: actionsBloques.length === 0, actionsBloques };
}

// ─── Initialisation de l'état d'une session ───────────────────────────────────

export function initialiserEtatSession(procedure: ProcedureMetier): EtatSession {
  const etapes: Record<string, EtatEtape> = {};
  for (const etape of procedure.etapes) {
    etapes[etape.id] = {
      etapeId: etape.id,
      statut: "pending",
      reponses: {},
    };
  }
  return { etapes };
}

// ─── Enregistrement d'une réponse ─────────────────────────────────────────────

export function enregistrerReponse(
  etat: EtatSession,
  etapeId: string,
  actionId: string,
  valeur: ValeurReponse
): EtatSession {
  const etatEtape = etat.etapes[etapeId] ?? {
    etapeId,
    statut: "en_cours" as const,
    reponses: {},
  };

  return {
    ...etat,
    etapes: {
      ...etat.etapes,
      [etapeId]: {
        ...etatEtape,
        statut: "en_cours",
        reponses: {
          ...etatEtape.reponses,
          [actionId]: {
            actionId,
            valeur,
            timestamp: new Date().toISOString(),
          },
        },
      },
    },
  };
}

// ─── Calcul de la synthèse finale ─────────────────────────────────────────────
//
// Priorité : impossible > incomplet > alerte > possible
//
// Justification métier : si une réponse bloquante est déjà détectée, la cessation
// est impossible indépendamment de ce qui reste à compléter. L'agent doit le voir
// immédiatement sans avoir à finir la procédure.

export function calculerSynthese(
  procedure: ProcedureMetier,
  etat: EtatSession
): Synthese {
  const blocages: ElementBlocage[] = [];
  const alertes: ElementAlerte[] = [];
  let actionsIncompletes = 0;

  for (const etape of etapesVisibles(procedure, etat)) {
    const etatEtape = etat.etapes[etape.id];

    for (const action of actionsVisibles(etape, etat)) {
      const valeur = etatEtape?.reponses[action.id]?.valeur;
      const repondu = valeur !== null && valeur !== undefined;

      if (action.obligatoire && !repondu) {
        actionsIncompletes++;
        continue;
      }

      if (!repondu || action.reponseAttendue === undefined) continue;
      if (valeur === action.reponseAttendue) continue;

      if (action.niveau === "bloquant") {
        blocages.push({
          etapeId: etape.id,
          etapeTitre: etape.titre,
          actionId: action.id,
          actionLabel: action.label,
          reponse: valeur,
          reponseAttendue: action.reponseAttendue,
        });
      } else if (action.niveau === "alerte") {
        alertes.push({
          etapeId: etape.id,
          etapeTitre: etape.titre,
          actionId: action.id,
          actionLabel: action.label,
          reponse: valeur,
          note: action.note,
        });
      }
    }
  }

  // Priorité : impossible > incomplet > alerte > possible
  let statut: StatutSynthese;
  let message: string;

  if (blocages.length > 0) {
    statut = "impossible";
    message = `Cessation impossible — ${blocages.length} point${blocages.length > 1 ? "s" : ""} bloquant${blocages.length > 1 ? "s" : ""} non conforme${blocages.length > 1 ? "s" : ""}.`;
  } else if (actionsIncompletes > 0) {
    statut = "incomplet";
    message = `Procédure incomplète — ${actionsIncompletes} action${actionsIncompletes > 1 ? "s" : ""} obligatoire${actionsIncompletes > 1 ? "s" : ""} en attente.`;
  } else if (alertes.length > 0) {
    statut = "possible_avec_alerte";
    message = `Cessation possible — ${alertes.length} point${alertes.length > 1 ? "s" : ""} d'alerte à prendre en compte.`;
  } else {
    statut = "possible";
    message = "Toutes les vérifications sont satisfaisantes. Cessation autorisée.";
  }

  return {
    statut,
    message,
    blocages,
    alertes,
    actionsIncompletes,
    computedAt: new Date().toISOString(),
  };
}
