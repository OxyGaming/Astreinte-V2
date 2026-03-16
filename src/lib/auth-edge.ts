// Utilisé par le middleware (Edge Runtime) — pas de modules Node.js

export const COOKIE_NAME = "astreinte-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

const getSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[SÉCURITÉ] SESSION_SECRET est obligatoire en production. Définissez cette variable d'environnement."
      );
    }
    return "astreinte-dev-insecure-do-not-use-in-prod";
  }
  return secret;
};

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
