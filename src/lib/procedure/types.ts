/**
 * Types du moteur de procédure métier.
 * Fichier autonome — aucun import de src/lib/types.ts pour éviter les conflits.
 */

// ─── Action : 5 types V1 core ─────────────────────────────────────────────────

export type TypeAction =
  | "information"      // Affichage pur, aucune réponse requise
  | "question_oui_non" // Réponse Oui / Non
  | "question_choix"   // Choix parmi une liste
  | "saisie_texte"     // Saisie libre
  | "confirmation";    // Checkbox "J'ai effectué cette action"

// Enrichissements UI (n'impactent pas le moteur, portés comme champs optionnels)
//   contactId?    → affiche un PhoneButton (appel direct)
//   referenceDoc? → affiche un badge référence réglementaire

// ─── Niveau d'une action ─────────────────────────────────────────────────────

export type NiveauAction =
  | "informatif"  // Jamais bloquant, affiché tel quel
  | "alerte"      // Avertissement si reponseAttendue non respectée, progression autorisée
  | "bloquant";   // Progression interdite si reponseAttendue non respectée

// ─── Valeur de réponse ────────────────────────────────────────────────────────

export type ValeurReponse = string | boolean | null;

// ─── Conditions (parsées en V1, évaluées en V2) ───────────────────────────────

export type OperateurCondition = "eq" | "neq" | "in" | "exists" | "not_exists";

export interface Condition {
  actionId: string;
  operateur: OperateurCondition;
  valeur?: string | boolean | string[];
}

export interface ConditionGroupe {
  logique: "AND" | "OR";
  conditions: (Condition | ConditionGroupe)[];
}

export type ConditionExpr = Condition | ConditionGroupe;

// ─── Action ───────────────────────────────────────────────────────────────────

export interface ActionMetier {
  id: string;                        // Unique dans toute la procédure
  type: TypeAction;
  label: string;                     // Texte principal affiché
  description?: string;             // Contexte complémentaire (gris sous le label)
  note?: string;                     // Vigilance / réf. réglementaire (amber)

  reponsesDisponibles?: string[];    // Pour question_choix uniquement
  reponseAttendue?: ValeurReponse;   // Valeur "correcte" attendue

  obligatoire: boolean;             // Doit être répondu pour avancer
  verifiable: boolean;              // V2 : peut être auto-vérifié par le système (flag préparatoire, sans effet en V1)
  niveau: NiveauAction;             // Impact d'une mauvaise réponse sur la synthèse

  // Enrichissements UI (sans impact moteur)
  contactId?: string;               // Affiche un PhoneButton si présent
  referenceDoc?: string;            // Affiche un badge référence si présent

  // V2 : présent dans le JSON, ignoré par le moteur V1
  conditionAffichage?: ConditionExpr;
}

// ─── Étape ────────────────────────────────────────────────────────────────────

export interface EtapeMetier {
  id: string;
  titre: string;
  description?: string;
  icone?: string;       // Nom d'icône Lucide (ex: "AlertTriangle", "Phone")
  ordre: number;
  actions: ActionMetier[];

  // V2 : présent dans le JSON, ignoré par le moteur V1
  conditionAffichage?: ConditionExpr;
}

// ─── Procédure ────────────────────────────────────────────────────────────────

export type TypeProcedure =
  | "cessation"
  | "reprise"
  | "incident"
  | "travaux"
  | "autre";

export interface ProcedureMetier {
  id: string;
  slug: string;
  titre: string;
  typeProcedure: TypeProcedure;
  description?: string;
  version: string;       // ex: "1.0"
  etapes: EtapeMetier[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Runtime : réponse à une action ──────────────────────────────────────────

export interface ReponseAction {
  actionId: string;
  valeur: ValeurReponse;
  timestamp: string;     // ISO 8601
}

// ─── Runtime : état d'une étape ───────────────────────────────────────────────

export type StatutEtape = "pending" | "en_cours" | "complete" | "ignoree";

export interface EtatEtape {
  etapeId: string;
  statut: StatutEtape;
  reponses: Record<string, ReponseAction>; // actionId → réponse
}

// ─── Runtime : état global de session ────────────────────────────────────────
// Correspond exactement au champ `etat` JSON persisté en base (1:1, sans écart)

export interface EtatSession {
  etapes: Record<string, EtatEtape>; // etapeId → état
}

// ─── Synthèse finale ──────────────────────────────────────────────────────────

/**
 * Ordre de priorité : impossible > incomplet > alerte > possible
 *
 * Métier : si une réponse bloquante est déjà détectée, la cessation est impossible
 * indépendamment de ce qui reste à remplir — l'agent doit le voir immédiatement.
 */
export type StatutSynthese =
  | "possible"
  | "possible_avec_alerte"
  | "impossible"
  | "incomplet";

export interface ElementBlocage {
  etapeId: string;
  etapeTitre: string;
  actionId: string;
  actionLabel: string;
  reponse: ValeurReponse;
  reponseAttendue: ValeurReponse;
}

export interface ElementAlerte {
  etapeId: string;
  etapeTitre: string;
  actionId: string;
  actionLabel: string;
  reponse: ValeurReponse;
  note?: string;
}

export interface Synthese {
  statut: StatutSynthese;
  message: string;
  blocages: ElementBlocage[];
  alertes: ElementAlerte[];
  actionsIncompletes: number;
  computedAt: string; // ISO 8601
}

// ─── Session (runtime + persistée, 1:1 avec la table SessionProcedure) ────────

export type StatutSession = "en_cours" | "terminee" | "abandonnee";

export interface SessionProcedureMetier {
  id: string;
  procedureId: string;
  procedureVersion: string;
  procedureSnapshot: ProcedureMetier;   // Snapshot immuable capturé au démarrage
  posteId: string;                      // FK Poste
  posteSlug: string;                    // Dénormalisé pour lecture rapide
  agentNom?: string;
  statut: StatutSession;
  etapeIndex: number;
  etat: EtatSession;                    // ↔ champ `etat` JSON en base
  synthese?: Synthese;                  // Calculée et persistée à la clôture
  startedAt: string;
  completedAt?: string;
}
