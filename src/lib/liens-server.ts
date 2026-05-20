/**
 * Helpers serveur pour les liens rattachés à une entité (Fiche / Secteur /
 * Poste / étape de procédure). Dépend de Prisma — usage serveur uniquement.
 */
import { prisma } from "./prisma";
import { isValidHttpUrl, toLienRefs } from "./liens";

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
