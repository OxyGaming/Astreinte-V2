/**
 * RCI — titre par défaut proposé à la création depuis une source terrain.
 *
 * Un RCI créé depuis une **session** de fiche réflexe ou un **Livret CIL** ne
 * doit jamais rester « Sans titre » : la source porte déjà de quoi en proposer
 * un. Le titre reste une **proposition éditable** (colonne `Rci.title`) — il
 * n'alimente PAS le payload officiel du document.
 *
 * Distinction auto / personnalisé : portée par le flag `Rci.titleAuto`, pas par
 * comparaison de chaînes. Tant que `titleAuto` vaut `true`, le titre suit la
 * « Nature » du wizard ; dès que l'agent édite le champ, `titleAuto` passe à
 * `false` et le titre n'est plus jamais remplacé automatiquement.
 *
 * Module **pur** (aucune I/O) — testable et réutilisable client comme serveur.
 */
import { INCIDENT_TYPE_LABELS, type IncidentType } from "@/lib/cil/types";
import { isoToDateFr } from "@/lib/rci/reprise";

/** Repli quand la source ne fournit rien d'exploitable (jamais « Sans titre »). */
export const TITRE_A_COMPLETER = "RCI à compléter";

/** Assemble des fragments en un libellé propre : trim, vides écartés, un seul « — ». */
function joinParts(parts: (string | null | undefined)[]): string {
  const cleaned = parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0);
  return cleaned.join(" — ");
}

/**
 * Titre par défaut depuis une **session** : `Fiche/procédure — Date`.
 * La date (début de session) est ajoutée quand elle est disponible, comme pour
 * le Livret. Le titre de la fiche reste le signal primaire : sans lui, on tombe
 * sur le repli plutôt que d'afficher une date seule.
 * @returns le titre proposé, ou `TITRE_A_COMPLETER` si rien d'exploitable.
 */
export function defaultTitleFromSession(
  ficheTitre: string | null | undefined,
  startedAt?: string | null,
): string {
  const t = (ficheTitre ?? "").trim();
  if (t.length === 0) return TITRE_A_COMPLETER;
  const date = startedAt ? isoToDateFr(startedAt) : "";
  return joinParts([t, date]);
}

export type CilTitleSource = {
  type: string;
  typeLibre: string | null;
  lieu: string | null;
  /** ISO de l'incident — la date est ajoutée en fin de titre. */
  occurredAt: string | null;
};

/**
 * Titre par défaut depuis un **Livret CIL** : `Type — Lieu — Date`.
 * Les fragments absents sont retirés (pas de séparateur orphelin). Le type prend
 * `typeLibre` s'il est renseigné, sinon le libellé du type d'incident.
 */
export function defaultTitleFromCil(inc: CilTitleSource): string {
  const typeLabel =
    inc.typeLibre?.trim() ||
    INCIDENT_TYPE_LABELS[inc.type as IncidentType] ||
    inc.type?.trim() ||
    "";
  const date = inc.occurredAt ? isoToDateFr(inc.occurredAt) : "";
  const titre = joinParts([typeLabel, inc.lieu, date]);
  return titre.length > 0 ? titre : TITRE_A_COMPLETER;
}

/**
 * Décide de la mise à jour du titre **automatique** depuis la « Nature » du
 * wizard. Règles :
 *  - titre personnalisé (`titleAuto === false`) → on ne touche à rien (`null`) ;
 *  - Nature vide → on ne remet JAMAIS le titre à null (`null` = pas d'écriture) ;
 *  - sinon → le titre auto suit la Nature.
 *
 * @returns `{ title }` à écrire, ou `null` si le titre ne doit pas changer.
 */
export function autoTitleUpdate(
  titleAuto: boolean,
  nature: string | null | undefined,
): { title: string } | null {
  if (!titleAuto) return null;
  const n = (nature ?? "").trim();
  if (n.length === 0) return null;
  return { title: n };
}
