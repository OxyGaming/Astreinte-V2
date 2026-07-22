import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, teamScope } from "@/lib/auth";

/**
 * Sources terrain rattachables à un RCI : incidents du Livret CIL et sessions
 * de fiche réflexe visibles par l'utilisateur.
 *
 * Sert le sélecteur de rattachement du wizard. Volontairement plat et court
 * (50 entrées par famille, les plus récentes) : au-delà, l'utilisateur cherche
 * plutôt depuis le module d'origine et ouvre le RCI de là.
 */
export async function GET() {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }

  const [incidents, sessions] = await Promise.all([
    prisma.cilIncident.findMany({
      where: { ...teamScope(u) },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: {
        id: true,
        reference: true,
        type: true,
        typeLibre: true,
        lieu: true,
        occurredAt: true,
        status: true,
      },
    }),
    // `teamScope` filtre sur `authorId` ; les sessions portent `createdByUserId`.
    prisma.ficheSession.findMany({
      where: u.role === "ADMIN" ? {} : { createdByUserId: u.id },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        ficheSlug: true,
        ficheTitre: true,
        startedAt: true,
        endedAt: true,
        status: true,
      },
    }),
  ]);

  return NextResponse.json({ incidents, sessions });
}
