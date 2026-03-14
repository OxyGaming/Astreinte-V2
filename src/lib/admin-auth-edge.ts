// Version Edge-compatible de l'auth admin (pour le middleware)
export const ADMIN_COOKIE = "astreinte-admin";

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const secret = process.env.ADMIN_SESSION_SECRET || "admin-secret-2025";
    const decoded = atob(token);
    return decoded.startsWith(`${secret}:`);
  } catch {
    return false;
  }
}
