// Version Edge-compatible de l'auth admin (pour le middleware)
export const ADMIN_COOKIE = "astreinte-admin";

const getAdminSecret = (): string => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[SÉCURITÉ] ADMIN_SESSION_SECRET est obligatoire en production."
      );
    }
    return "admin-dev-insecure-do-not-use-in-prod";
  }
  return secret;
};

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = atob(token);
    return decoded.startsWith(`${getAdminSecret()}:`);
  } catch {
    return false;
  }
}
