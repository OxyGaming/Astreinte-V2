/**
 * Helpers serveur pour les liens rattachés à une entité (Fiche / Secteur /
 * Poste / étape de procédure). Dépend de Prisma — usage serveur uniquement.
 */
import { prisma } from "./prisma";
import { isValidHttpUrl, toLienRefs, parseLienRefs } from "./liens";
import type { LienRef } from "./types";

export type NormalizeLiensResult =
  | { ok: true; json: string; count: number }
  | { ok: false; error: string };

/**
 * Valide et normalise un tableau de LienRef reçu d'une requête.
 * - lien libre : libellé + URL http(s) obligatoires
 * - référence collection : le lienId doit exister dans la table Lien
 * Renvoie la chaîne JSON prête à stocker dans la colonne `liens`.
 */
export async function normalizeLiensPayload(raw: unknown): Promise<NormalizeLiensResult> {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'Champ "liens" manquant ou non-tableau' };
  }

  const refs = toLienRefs(raw);

  for (let i = 0; i < refs.length; i++) {
    const r = refs[i];
    if (!r.lienId) {
      if (!r.libelle) return { ok: false, error: `Lien ${i + 1} : libellé obligatoire` };
      if (!isValidHttpUrl(r.url)) {
        return { ok: false, error: `Lien ${i + 1} : URL invalide (http ou https attendu)` };
      }
    }
  }

  const lienIds = [...new Set(refs.filter((r) => r.lienId).map((r) => r.lienId as string))];
  if (lienIds.length) {
    const found = await prisma.lien.findMany({
      where: { id: { in: lienIds } },
      select: { id: true },
    });
    if (found.length !== lienIds.length) {
      return { ok: false, error: "Un lien référencé n'existe plus dans la collection." };
    }
  }

  return { ok: true, json: JSON.stringify(refs), count: refs.length };
}

/**
 * Variante synchrone de `normalizeLiensPayload` pour les imports en lot :
 * la liste des `lienId` valides est pré-chargée par l'appelant (un seul
 * round-trip DB pour tout le batch). Renvoie le JSON normalisé en cas de
 * succès, ou un message d'erreur en cas d'échec.
 *
 * Utilisé par les imports Excel (Fiches, Postes, Secteurs) : permet de
 * traiter N lignes sans N requêtes Prisma.
 */
export function normalizeLiensPayloadSync(
  raw: unknown,
  knownLienIds: Set<string>,
): NormalizeLiensResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'Champ "liens" manquant ou non-tableau' };
  }
  const refs = toLienRefs(raw);
  for (let i = 0; i < refs.length; i++) {
    const r = refs[i];
    if (r.lienId) {
      if (!knownLienIds.has(r.lienId)) {
        return { ok: false, error: `Lien ${i + 1} : référence "${r.lienId}" introuvable dans la collection` };
      }
    } else {
      if (!r.libelle) return { ok: false, error: `Lien ${i + 1} : libellé obligatoire` };
      if (!isValidHttpUrl(r.url)) {
        return { ok: false, error: `Lien ${i + 1} : URL invalide (http ou https attendu)` };
      }
    }
  }
  return { ok: true, json: JSON.stringify(refs), count: refs.length };
}

/**
 * Parse une chaîne JSON contenant un tableau de LienRef. Si la chaîne est
 * vide ou absente, renvoie `null` (sentinelle : pas de modification — on
 * conservera la valeur existante côté appelant). Si la chaîne est valide
 * mais représente un tableau invalide ou incohérent, renvoie une erreur.
 *
 * Conçu pour les imports : permet à un fichier sans colonne `liens_json`
 * de NE PAS écraser les liens existants en base.
 */
export function parseLiensImportField(
  raw: string | undefined | null,
  knownLienIds: Set<string>,
): { value: string | null; error?: string; count?: number } {
  if (raw === undefined || raw === null) return { value: null };
  const trimmed = String(raw).trim();
  if (!trimmed) return { value: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { value: null, error: "JSON malformé" };
  }
  const result = normalizeLiensPayloadSync(parsed, knownLienIds);
  if (!result.ok) return { value: null, error: result.error };
  return { value: result.json, count: result.count };
}

/**
 * Sérialise un tableau de LienRef[] pour l'export Excel : retourne `""` si
 * vide pour ne pas polluer les cellules vides avec `"[]"`. Tolère une
 * chaîne JSON déjà sérialisée en entrée.
 */
export function serializeLiensForExport(raw: string | null | undefined): string {
  const refs = parseLienRefs(raw ?? null);
  if (refs.length === 0) return "";
  return JSON.stringify(refs);
}

export type { LienRef };

