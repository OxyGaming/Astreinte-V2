/**
 * Garde-fous HTTP des routes Tournée (serveur uniquement).
 */
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/user-auth";
import { canManageContributions, canManageModeles } from "./server";

type Guard = { user: SessionUser; error: null } | { user: null; error: NextResponse };

const deny = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function guardUser(): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: deny(401, "Non authentifié") };
  return { user, error: null };
}

export async function guardModeleAdmin(): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user || !canManageModeles(user)) return { user: null, error: deny(403, "Accès refusé") };
  return { user, error: null };
}

export async function guardContributionManager(): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user || !canManageContributions(user)) return { user: null, error: deny(403, "Accès refusé") };
  return { user, error: null };
}

export const userLabel = (u: SessionUser) => `${u.prenom} ${u.nom}`.trim() || u.username;
