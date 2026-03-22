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

/** Valide les données d'inscription d'un nouvel utilisateur */
export function validateRegisterInput(body: unknown): {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  motif: string;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const { email, password, confirmPassword, nom, prenom, motif } =
    body as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string") return null;
  if (typeof nom !== "string" || typeof prenom !== "string") return null;
  if (typeof motif !== "string") return null;

  const n = nom.trim();
  const p = prenom.trim();
  const m = motif.trim();

  if (n.length < 1 || n.length > 100) return null;
  if (p.length < 1 || p.length > 100) return null;
  if (password.length < 8 || password.length > 200) return null;
  if (password.includes("\0")) return null;

  // Confirmation du mot de passe
  if (typeof confirmPassword !== "string" || password !== confirmPassword) return null;

  // Email requis
  const e = email.trim().toLowerCase();
  if (e.length < 5 || e.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;

  // Motif requis (min 10 caractères)
  if (m.length < 10 || m.length > 500) return null;

  return { email: e, password, nom: n, prenom: p, motif: m };
}

/** Valide les identifiants de login back-office admin (username + mot de passe) */
export function validateAdminLoginInput(username: unknown, password: unknown): {
  username: string;
  password: string;
} | null {
  if (typeof username !== "string" || typeof password !== "string") return null;
  const u = username.trim();
  const p = password;
  if (u.length < 1 || u.length > 100) return null;
  if (p.length < 1 || p.length > 200) return null;
  if (u.includes("\0") || p.includes("\0")) return null;
  return { username: u, password: p };
}

/** Valide les identifiants de login (email + mot de passe) */
export function validateLoginInput(email: unknown, password: unknown): {
  email: string;
  password: string;
} | null {
  if (typeof email !== "string" || typeof password !== "string") return null;
  const e = email.trim().toLowerCase();
  const p = password;
  if (e.length < 5 || e.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  if (p.length < 1 || p.length > 200) return null;
  if (e.includes("\0") || p.includes("\0")) return null;
  return { email: e, password: p };
}
