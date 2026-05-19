/** Helpers de formatage sans dépendance Node — réutilisables côté client. */

/** Formate une taille en octets en chaîne lisible (Ko / Mo). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

/** Formate une date d'upload en JJ/MM/AAAA (locale fr-FR). */
export function formatDocumentDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
