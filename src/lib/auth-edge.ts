// Utilisé par le middleware (Edge Runtime) — pas de modules Node.js

export const COOKIE_NAME = "astreinte-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

/** Token dérivé du secret + identifiants — compatible Edge Runtime */
export function getToken(): string {
  const secret = process.env.SESSION_SECRET || "astreinte-internal-2025";
  const user = process.env.AUTH_USER || "eic";
  const pass = process.env.AUTH_PASSWORD || "exploitant";
  return btoa(`${secret}:${user}:${pass}`);
}

export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  return token === getToken();
}
