/**
 * Utilitaires purs pour les liens (importables côté client et serveur —
 * aucune dépendance à Prisma).
 */
import type { Lien, LienRef, ResolvedLien } from "./types";

/**
 * true si `value` est une URL http(s) valide.
 * Garde-fou anti-injection : rejette `javascript:`, `data:`, etc.
 */
export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalise une valeur déjà désérialisée en LienRef[] propre.
 * Conserve les entrées rattachées à la collection (lienId) ou les liens
 * libres possédant une URL ; rejette le reste.
 */
export function toLienRefs(value: unknown): LienRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => {
      const ref: LienRef = {};
      if (typeof e.lienId === "string" && e.lienId.trim()) ref.lienId = e.lienId.trim();
      if (typeof e.libelle === "string" && e.libelle.trim()) ref.libelle = e.libelle.trim();
      if (typeof e.url === "string" && e.url.trim()) ref.url = e.url.trim();
      return ref;
    })
    .filter((r) => r.lienId || r.url);
}

/** Parse une colonne / valeur JSON `liens` en LienRef[]. */
export function parseLienRefs(raw: string | null | undefined): LienRef[] {
  if (!raw) return [];
  try {
    return toLienRefs(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Résout des LienRef[] en ResolvedLien[] à partir d'une collection déjà
 * chargée. Fonction pure — utilisable côté client (éditeur, wizard).
 */
export function resolveLienRefs(refs: LienRef[], collection: Lien[]): ResolvedLien[] {
  const byId = new Map(collection.map((l) => [l.id, l]));
  return refs.map((ref): ResolvedLien => {
    if (ref.lienId) {
      const lien = byId.get(ref.lienId);
      if (lien) {
        return { libelle: ref.libelle?.trim() || lien.libelle, url: lien.url, lienId: lien.id, linked: true, orphan: false };
      }
      return { libelle: ref.libelle?.trim() || "Lien indisponible", url: "", lienId: ref.lienId, linked: true, orphan: true };
    }
    return { libelle: ref.libelle?.trim() || ref.url || "", url: (ref.url ?? "").trim(), linked: false, orphan: false };
  });
}
