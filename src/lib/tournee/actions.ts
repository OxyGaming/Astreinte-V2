/**
 * Traduction des gestes terrain en événements du journal — pur.
 * Aucun geste n'est bloqué par le temps : ces fonctions décrivent seulement
 * la suite d'événements cohérente.
 */
import type { Progression } from "./planning";
import type { TourneeEventType, TourneePlanEtape } from "./types";

export type EventSpec = { type: TourneeEventType; etapeKey?: string | null };

/** Reste-t-il une étape obligatoire à venir après `key` (hors `key`) ? */
function resteObligatoire(etapes: TourneePlanEtape[], prog: Progression, key: string): boolean {
  const idx = etapes.findIndex((e) => e.key === key);
  return etapes.some((e, i) => i > idx && !e.optionnelle && prog.etats.get(e.key)?.statut === "a_venir");
}

/** Démarrer (ou valider le passage d'une étape sans durée). */
export function demarrerEtape(etapes: TourneePlanEtape[], prog: Progression, key: string): EventSpec[] {
  const e = etapes.find((x) => x.key === key);
  if (!e) return [];
  const out: EventSpec[] = [];
  if (!prog.demarre) out.push({ type: "TOURNEE_DEBUT" });
  out.push({ type: "ETAPE_DEBUT", etapeKey: key });
  if (e.dureeMin === 0) {
    out.push({ type: "ETAPE_FIN", etapeKey: key });
    if (!resteObligatoire(etapes, prog, key)) out.push({ type: "TOURNEE_FIN" });
  }
  return out;
}

/** Terminer l'étape en cours ; clôt la tournée si c'était la dernière obligatoire. */
export function terminerEtape(etapes: TourneePlanEtape[], prog: Progression, key: string): EventSpec[] {
  const out: EventSpec[] = [{ type: "ETAPE_FIN", etapeKey: key }];
  if (!resteObligatoire(etapes, prog, key)) out.push({ type: "TOURNEE_FIN" });
  return out;
}

/** Démarrer la tournée : début + première étape obligatoire. */
export function demarrerTournee(etapes: TourneePlanEtape[], prog: Progression): EventSpec[] {
  const premiere = etapes.find((e) => !e.optionnelle);
  if (!premiere) return [{ type: "TOURNEE_DEBUT" }];
  return demarrerEtape(etapes, prog, premiere.key);
}

export const ignorerEtape = (key: string): EventSpec[] => [{ type: "ETAPE_IGNOREE", etapeKey: key }];
export const reprendreEtape = (key: string): EventSpec[] => [{ type: "ETAPE_REPRISE", etapeKey: key }];

/** Position « Étape x / N » parmi les obligatoires (null pour une optionnelle). */
export function positionEtape(etapes: TourneePlanEtape[], key: string | null): { x: number; n: number } | null {
  const obligs = etapes.filter((e) => !e.optionnelle);
  if (!key) return null;
  const i = obligs.findIndex((e) => e.key === key);
  return i < 0 ? null : { x: i + 1, n: obligs.length };
}
