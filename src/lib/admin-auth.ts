// Auth admin — uniquement côté serveur (Server Actions, Route Handlers)
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { COOKIE_NAME, isValidToken, getUserIdFromToken } from "./auth-edge";

/**
 * Vérifie si l'utilisateur connecté a le rôle ADMIN en base de données.
 * Ne fait pas confiance au rôle dans le token seul — vérification DB systématique.
 */
export async function isFrontOfficeAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!(await isValidToken(token))) return false;

  const userId = getUserIdFromToken(token!);
  if (!userId) return false;

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
 * Exige une session admin valide — redirige vers /login sinon.
 * Un seul mécanisme : cookie front-office d'un utilisateur avec role=ADMIN.
 */
export async function requireAdminSession(): Promise<void> {
  if (await isFrontOfficeAdmin()) return;

  const { redirect } = await import("next/navigation");
  redirect("/login?from=/admin");
}
