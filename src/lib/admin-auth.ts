// Auth admin — uniquement côté serveur (Server Actions, Route Handlers)
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, isValidToken, getUserIdFromToken } from "./auth-edge";

export const ADMIN_COOKIE = "astreinte-admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

/** Vérifie les identifiants admin et retourne l'user ou null */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<{ id: string; username: string } | null> {
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return { id: user.id, username: user.username };
}

const getAdminSecret = (): string => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[SÉCURITÉ] ADMIN_SESSION_SECRET est obligatoire en production. Définissez cette variable d'environnement."
      );
    }
    return "admin-dev-insecure-do-not-use-in-prod";
  }
  return secret;
};

/** Crée un token de session admin */
export function createAdminToken(userId: string): string {
  return Buffer.from(`${getAdminSecret()}:${userId}`).toString("base64");
}

/** Valide un token admin */
export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.startsWith(`${getAdminSecret()}:`);
  } catch {
    return false;
  }
}

/** Lit le cookie admin et vérifie sa validité (Server Component) */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(token);
}

/**
 * Vérifie si l'utilisateur front-office connecté a le rôle ADMIN en base de données.
 * Cette fonction requête la DB — elle ne fait pas confiance au rôle dans le token seul.
 * Retourne true si l'utilisateur est ADMIN, actif et approuvé.
 */
async function isFrontOfficeAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!isValidToken(token)) return false;

  const userId = getUserIdFromToken(token!);
  if (!userId) return false;

  // Vérification en DB : source de vérité pour le rôle
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, actif: true, status: true },
  });

  return (
    user?.role === "ADMIN" &&
    user.actif === true &&
    user.status === "approved"
  );
}

/**
 * Exige une session admin valide — redirige sinon (Server Component helper).
 *
 * Deux mécanismes acceptés (par ordre de priorité) :
 *   1. Cookie "astreinte-admin" valide (compte AdminUser dédié)
 *   2. Cookie "astreinte-auth" d'un utilisateur front-office avec role=ADMIN,
 *      actif=true, status="approved" (vérifié en DB — autorité finale)
 *
 * Cette double vérification est la garde côté serveur qui complète le middleware.
 * Elle est appelée dans chaque page et Server Action admin.
 */
export async function requireAdminSession(): Promise<void> {
  // Priorité 1 : cookie admin classique (AdminUser)
  if (await getAdminSession()) return;

  // Priorité 2 : utilisateur front-office ADMIN (vérification DB)
  if (await isFrontOfficeAdmin()) return;

  // Accès refusé → redirection
  const { redirect } = await import("next/navigation");
  redirect("/admin/login");
}
