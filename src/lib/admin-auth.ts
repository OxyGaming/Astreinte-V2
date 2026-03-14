// Auth admin — uniquement côté serveur (Server Actions, Route Handlers)
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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

/** Crée un token de session admin (simple, suffisant pour MVP) */
export function createAdminToken(userId: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "admin-secret-2025";
  return Buffer.from(`${secret}:${userId}`).toString("base64");
}

/** Valide un token admin */
export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const secret = process.env.ADMIN_SESSION_SECRET || "admin-secret-2025";
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.startsWith(`${secret}:`);
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

/** Exige une session admin valide — redirige sinon (Server Component helper) */
export async function requireAdminSession(): Promise<void> {
  const valid = await getAdminSession();
  if (!valid) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
}
