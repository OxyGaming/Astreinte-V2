/**
 * POST /api/procedures/[slug]/sessions
 * Démarre une nouvelle session d'exécution pour une procédure donnée.
 * Capture le snapshot immuable de la procédure au moment du démarrage.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import { initialiserEtatSession } from "@/lib/procedure/engine";
import type { ProcedureMetier, EtapeMetier } from "@/lib/procedure/types";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { slug } = await params;

  let body: { posteId?: string; agentNom?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!body.posteId) {
    return NextResponse.json({ error: "posteId requis" }, { status: 400 });
  }

  // Charger la procédure
  const proc = await prisma.procedure.findUnique({ where: { slug } });
  if (!proc) return NextResponse.json({ error: "Procédure introuvable" }, { status: 404 });

  // Vérifier que la procédure est associée au poste
  const lien = await prisma.posteProcedure.findUnique({
    where: { posteId_procedureId: { posteId: body.posteId, procedureId: proc.id } },
  });
  if (!lien) {
    return NextResponse.json({ error: "Cette procédure n'est pas associée à ce poste" }, { status: 403 });
  }

  // Charger le poste pour le slug dénormalisé
  const poste = await prisma.poste.findUnique({ where: { id: body.posteId }, select: { slug: true } });
  if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

  // Construire le snapshot immuable
  const snapshot: ProcedureMetier = {
    id: proc.id,
    slug: proc.slug,
    titre: proc.titre,
    typeProcedure: proc.typeProcedure as ProcedureMetier["typeProcedure"],
    description: proc.description ?? undefined,
    version: proc.version,
    etapes: JSON.parse(proc.etapes) as EtapeMetier[],
    createdAt: proc.createdAt.toISOString(),
    updatedAt: proc.updatedAt.toISOString(),
  };

  // Initialiser l'état de session
  const etatInitial = initialiserEtatSession(snapshot);

  const session = await prisma.sessionProcedure.create({
    data: {
      procedureId: proc.id,
      procedureVersion: proc.version,
      procedureSnapshot: JSON.stringify(snapshot),
      posteId: body.posteId,
      posteSlug: poste.slug,
      agentNom: body.agentNom ?? null,
      statut: "en_cours",
      etapeIndex: 0,
      etat: JSON.stringify(etatInitial),
    },
  });

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
