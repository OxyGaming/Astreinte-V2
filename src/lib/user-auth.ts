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

export type CredentialResult =
  | { user: SessionUser; error: null }
  | { user: null; error: "invalid" | "pending" | "rejected" | "inactive" };

/** Vérifie les identifiants et retourne l'utilisateur ou une raison de refus */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<CredentialResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { user: null, error: "invalid" };

  // Vérifier le mot de passe en premier (évite l'énumération de comptes via timing)
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { user: null, error: "invalid" };

  // Vérifier le statut d'inscription
  if (user.status === "pending") return { user: null, error: "pending" };
  if (user.status === "rejected") return { user: null, error: "rejected" };

  // Vérifier si le compte est actif
  if (!user.actif) return { user: null, error: "inactive" };

  return {
    user: { id: user.id, username: user.username, nom: user.nom, prenom: user.prenom, role: user.role },
    error: null,
  };
}

/** Lit le cookie et retourne l'utilisateur courant, ou null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!(await isValidToken(token))) return null;
  const userId = getUserIdFromToken(token!);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, status: true },
  });
  if (!user || !user.actif || user.status !== "approved") return null;
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

/**
 * Autorise l'accès à une session de fiche.
 * USER : uniquement le créateur. EDITOR/ADMIN : toutes les sessions (supervision).
 */
export function canAccessSession(
  user: { id: string; role: string },
  session: { createdByUserId: string }
): boolean {
  if (user.role === "ADMIN" || user.role === "EDITOR") return true;
  return session.createdByUserId === user.id;
}
