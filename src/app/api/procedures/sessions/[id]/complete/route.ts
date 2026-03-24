/**
 * POST /api/procedures/sessions/[id]/complete
 * Clôture une session : calcule la synthèse, la persiste, marque terminée.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import { calculerSynthese } from "@/lib/procedure/engine";
import type { EtatSession, ProcedureMetier, EtapeMetier } from "@/lib/procedure/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.sessionProcedure.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  if (session.statut !== "en_cours") {
    return NextResponse.json({ error: "Session déjà clôturée" }, { status: 409 });
  }

  const snapshot = JSON.parse(session.procedureSnapshot) as ProcedureMetier;
  // Reconstruire les étapes si besoin (le snapshot peut venir d'une ancienne version)
  const procedure: ProcedureMetier = {
    ...snapshot,
    etapes: snapshot.etapes as EtapeMetier[],
  };
  const etat: EtatSession = JSON.parse(session.etat);

  const synthese = calculerSynthese(procedure, etat);

  const updated = await prisma.sessionProcedure.update({
    where: { id },
    data: {
      statut: "terminee",
      synthese: JSON.stringify(synthese),
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    sessionId: updated.id,
    statut: updated.statut,
    synthese,
    completedAt: updated.completedAt?.toISOString(),
  });
}
