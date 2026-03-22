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

/**
 * Crée un token de session encodant l'userId et le rôle.
 * Format : btoa("secret:userId:role")
 * Compatible Edge Runtime (utilise btoa).
 */
export function createUserToken(userId: string, role: string): string {
  return btoa(`${getSecret()}:${userId}:${role}`);
}

/**
 * Valide le format du token (sans accès DB).
 * Accepte l'ancien format (secret:userId) et le nouveau (secret:userId:role).
 */
export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = atob(token);
    return decoded.startsWith(`${getSecret()}:`);
  } catch {
    return false;
  }
}

/**
 * Extrait l'userId depuis un token valide.
 * Gère les deux formats : secret:userId (ancien) et secret:userId:role (nouveau).
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = atob(token);
    const parts = decoded.split(":");
    // Format minimum : secret + userId = 2 parties
    if (parts.length < 2) return null;
    if (parts[0] !== getSecret()) return null;
    // parts[1] = userId (les UUIDs ne contiennent pas de ":")
    return parts[1] || null;
  } catch {
    return null;
  }
}

/**
 * Extrait le rôle depuis un token valide.
 * Retourne null si le token est au format ancien (sans rôle).
 */
export function getRoleFromToken(token: string): string | null {
  try {
    const decoded = atob(token);
    const parts = decoded.split(":");
    // Format nouveau : secret:userId:role = 3 parties minimum
    if (parts.length < 3) return null;
    if (parts[0] !== getSecret()) return null;
    return parts[2] || null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si un token front-office correspond à un utilisateur ADMIN.
 * Utilisé par le middleware pour autoriser l'accès aux routes /admin
 * sans cookie admin séparé.
 * Note : la vérification DB reste effectuée côté serveur dans requireAdminSession().
 */
export function isAdminUserToken(token: string | undefined): boolean {
  if (!token) return false;
  return isValidToken(token) && getRoleFromToken(token) === "ADMIN";
}
