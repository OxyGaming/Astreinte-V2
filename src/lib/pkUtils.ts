/**
 * Utilitaires métier pour la recherche de points d'accès par point kilométrique (PK).
 *
 * Format PK ferroviaire : "{km}+{m}"  ex: 389+364, 12+005
 * Représentation interne en mètres entiers :  389+364 → 389364
 *
 * Ces fonctions sont pures et testables indépendamment de l'UI.
 */

import type { AccesRail } from "./types";

// ─── Conversion PK → mètres ───────────────────────────────────────────────────

/**
 * Convertit un PK ferroviaire en mètres entiers.
 *
 * Formats acceptés :
 *   "389+364"   → 389364
 *   "12+005"    → 12005
 *   " 389+200 " → 389200  (espaces ignorés)
 *   "387"       → 387000  (PK entier = km sans décimale)
 *
 * Retourne null si le format est invalide ou vide.
 */
export function parsePkToMeters(pk: string): number | null {
  if (!pk) return null;

  // Supprimer tous les espaces
  const clean = pk.replace(/\s+/g, "");
  if (!clean) return null;

  const plusIdx = clean.indexOf("+");

  if (plusIdx === -1) {
    // Pas de séparateur : PK entier (ex: "387" → 387 km = 387000 m)
    const km = parseInt(clean, 10);
    if (isNaN(km) || clean !== String(km)) return null; // rejette "387abc"
    return km * 1000;
  }

  const kmPart = clean.slice(0, plusIdx);
  const mPart = clean.slice(plusIdx + 1);

  if (!kmPart || !mPart) return null;

  const km = parseInt(kmPart, 10);
  const m = parseInt(mPart, 10);

  if (isNaN(km) || isNaN(m)) return null;
  if (String(km) !== kmPart || !/^\d+$/.test(mPart)) return null; // rejette les négatifs et non-numériques

  return km * 1000 + m;
}

// ─── Résultat de recherche par PK ─────────────────────────────────────────────

export interface PkSearchResult extends AccesRail {
  ecartMetres: number;
}

// ─── Recherche des accès les plus proches d'un PK ─────────────────────────────

/**
 * Recherche les points d'accès les plus proches d'un PK donné sur une ligne donnée.
 *
 * - Filtre par ligne (obligatoire)
 * - Exclut les points sans PK exploitable
 * - Trie par écart absolu croissant
 * - Limite au nombre demandé (défaut : 10)
 *
 * Retourne un tableau vide si le PK saisi est invalide.
 */
export function findClosestByPk(
  points: AccesRail[],
  ligne: string,
  pkSaisi: string,
  limit = 10
): PkSearchResult[] {
  const pkSaisiMetres = parsePkToMeters(pkSaisi);
  if (pkSaisiMetres === null) return [];

  const results: PkSearchResult[] = [];

  for (const p of points) {
    if (p.ligne !== ligne) continue;
    const pkPointMetres = parsePkToMeters(p.pk);
    if (pkPointMetres === null) continue;
    results.push({ ...p, ecartMetres: Math.abs(pkPointMetres - pkSaisiMetres) });
  }

  results.sort((a, b) => a.ecartMetres - b.ecartMetres);
  return results.slice(0, limit);
}

// ─── Formatage de l'écart ─────────────────────────────────────────────────────

/**
 * Formate un écart en mètres pour l'affichage.
 *
 * Ex :  0 → "PK exact"
 *      80 → "80 m"
 *    1200 → "1,2 km"
 */
export function formatEcart(metres: number): string {
  if (metres === 0) return "PK exact";
  if (metres < 1000) return `${metres} m`;
  const km = metres / 1000;
  return `${km.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} km`;
}

/**
 * Valide un PK saisi et retourne un message d'erreur lisible, ou null si valide.
 */
export function validatePkInput(pk: string): string | null {
  if (!pk.trim()) return "Veuillez saisir un PK.";
  if (parsePkToMeters(pk) === null)
    return `Format PK invalide. Exemples : 389+364, 389+200, 387`;
  return null;
}
