/**
 * Validateurs d'entrées API — sans dépendance externe.
 * Toutes les fonctions retournent les données nettoyées ou null si invalide.
 */

/** Valide les paramètres de création d'une session */
export function validateSessionCreate(body: unknown): {
  ficheSlug: string;
  ficheTitre: string;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const { ficheSlug, ficheTitre } = body as Record<string, unknown>;
  if (typeof ficheSlug !== "string" || ficheSlug.length < 1 || ficheSlug.length > 120) return null;
  if (typeof ficheTitre !== "string" || ficheTitre.trim().length < 1 || ficheTitre.length > 250) return null;
  // Slug : uniquement lettres minuscules, chiffres et tirets
  if (!/^[a-z0-9-]+$/.test(ficheSlug)) return null;
  return { ficheSlug, ficheTitre: ficheTitre.trim() };
}

/** Valide une action de journal (cochage / décochage) */
export function validateActionLog(body: unknown): {
  etapeOrdre: number;
  actionIndex: number;
  actionLabel: string;
  type: "checked" | "unchecked";
} | null {
  if (typeof body !== "object" || body === null) return null;
  const { etapeOrdre, actionIndex, actionLabel, type } = body as Record<string, unknown>;
  if (!Number.isInteger(etapeOrdre) || (etapeOrdre as number) < 0 || (etapeOrdre as number) > 9999) return null;
  if (!Number.isInteger(actionIndex) || (actionIndex as number) < 0 || (actionIndex as number) > 9999) return null;
  if (typeof actionLabel !== "string" || actionLabel.trim().length < 1 || actionLabel.length > 500) return null;
  if (type !== "checked" && type !== "unchecked") return null;
  return {
    etapeOrdre: etapeOrdre as number,
    actionIndex: actionIndex as number,
    actionLabel: actionLabel.trim(),
    type,
  };
}

/** Valide un commentaire de journal */
export function validateComment(body: unknown): { message: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const { message } = body as Record<string, unknown>;
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) return null;
  return { message: trimmed };
}

/** Valide les identifiants de login (longueur minimale, pas de caractères nuls) */
export function validateLoginInput(username: unknown, password: unknown): {
  username: string;
  password: string;
} | null {
  if (typeof username !== "string" || typeof password !== "string") return null;
  const u = username.trim();
  const p = password;
  if (u.length < 1 || u.length > 100) return null;
  if (p.length < 1 || p.length > 200) return null;
  // Refus des caractères nuls (protection contre certaines injections)
  if (u.includes("\0") || p.includes("\0")) return null;
  return { username: u, password: p };
}
