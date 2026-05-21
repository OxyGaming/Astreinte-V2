/**
 * Helpers de recherche texte — insensibles à la casse et aux accents.
 * Partagés par les filtres dynamiques des listes (recherche, contacts, fiches…).
 */

/** Normalise une chaîne pour comparaison : minuscules, sans accents. */
export function normalizeSearch(str: string): string {
  // NFD décompose les lettres accentuées (é → e + diacritique) ; on retire
  // ensuite les marques combinantes (plage Unicode U+0300–U+036F).
  let out = "";
  for (const ch of str.toLowerCase().normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) out += ch;
  }
  return out;
}

/** Vrai si `text` contient `query` (comparaison normalisée). null/undefined → false. */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return normalizeSearch(text).includes(normalizeSearch(query));
}
