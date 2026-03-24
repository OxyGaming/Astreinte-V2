/**
 * POST /api/procedures/[slug]/sessions
 * Démarre une nouvelle session d'exécution pour une procédure donnée.
 * Capture le snapshot immuable de la procédure au moment du démarrage.
 * Écrit l'événement session_started (sequence = 1) dans la même transaction.
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

  let body: { posteId?: string } = {};
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
  const actorNom = `${user.prenom} ${user.nom}`.trim() || user.username;

  // Création session + événement session_started dans la même transaction
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.sessionProcedure.create({
      data: {
        procedureId:       proc.id,
        procedureVersion:  proc.version,
        procedureSnapshot: JSON.stringify(snapshot),
        posteId:           body.posteId!,
        posteSlug:         poste.slug,
        agentNom:          actorNom,   // nom de l'utilisateur connecté
        statut:            "en_cours",
        etapeIndex:        0,
        etat:              JSON.stringify(etatInitial),
      },
    });

    await tx.sessionProcedureEvent.create({
      data: {
        sessionId: created.id,
        sequence:  1,   // premier événement — pas besoin de calculer MAX
        type:      "session_started",
        payload:   JSON.stringify({
          procedureId:      proc.id,
          procedureVersion: proc.version,
          posteSlug:        poste.slug,
          agentNom:         actorNom,
        }),
        actorNom,
      },
    });

    return created;
  });

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
