// Utilisé par le middleware (Edge Runtime) — pas de modules Node.js

export const COOKIE_NAME = "astreinte-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

const getSecret = () => process.env.SESSION_SECRET || "astreinte-internal-2025";

/** Crée un token encodant l'userId — compatible Edge Runtime */
export function createUserToken(userId: string): string {
  return btoa(`${getSecret()}:${userId}`);
}

/** Valide le format du token (sans accès DB) */
export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = atob(token);
    return decoded.startsWith(`${getSecret()}:`);
  } catch {
    return false;
  }
}

/** Extrait l'userId depuis un token valide */
export function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = atob(token);
    const colon = decoded.indexOf(":");
    if (colon === -1) return null;
    const secret = decoded.substring(0, colon);
    if (secret !== getSecret()) return null;
    return decoded.substring(colon + 1);
  } catch {
    return null;
  }
}
