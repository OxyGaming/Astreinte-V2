// Auth utilisateur front-office — Node.js runtime uniquement (pas Edge)
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, isValidToken, getUserIdFromToken } from "./auth-edge";

export type SessionUser = {
  id: string;
  username: string;
  nom: string;
  prenom: string;
  role: string; // ADMIN | EDITOR | USER
};

/** Vérifie les identifiants et retourne l'utilisateur ou null */
export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.actif) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return { id: user.id, username: user.username, nom: user.nom, prenom: user.prenom, role: user.role };
}

/** Lit le cookie et retourne l'utilisateur courant, ou null */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!isValidToken(token)) return null;
  const userId = getUserIdFromToken(token!);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true },
  });
  if (!user || !user.actif) return null;
  return { id: user.id, username: user.username, nom: user.nom, prenom: user.prenom, role: user.role };
}

/** Exige une session valide — redirige vers /login sinon */
export async function requireUserSession(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user!;
}

/** Hash un mot de passe avec bcrypt */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
