/**
 * GET  /api/procedures/sessions/[id]   → Récupère l'état complet de la session
 * PATCH /api/procedures/sessions/[id]  → Mise à jour (réponse enregistrée ou avancement d'étape)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import { enregistrerReponse } from "@/lib/procedure/engine";
import type { EtatSession, ValeurReponse } from "@/lib/procedure/types";

type Params = { params: Promise<{ id: string }> };

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.sessionProcedure.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  return NextResponse.json(dbToSession(session));
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
//
// Corps attendu (l'un ou l'autre) :
//   { action: "repondre",  etapeId, actionId, valeur }   → enregistre une réponse
//   { action: "avancer",   etapeIndex }                  → met à jour l'étape en cours
//   { action: "abandonner" }                             → marque la session abandonnée

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.sessionProcedure.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  if (session.statut !== "en_cours") {
    return NextResponse.json({ error: "Session déjà clôturée" }, { status: 409 });
  }

  let body: { action?: string; etapeId?: string; actionId?: string; valeur?: ValeurReponse; etapeIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "Champ 'action' requis" }, { status: 400 });
  }

  // ── Enregistrement d'une réponse ────────────────────────────────────────────
  if (body.action === "repondre") {
    if (!body.etapeId || !body.actionId || body.valeur === undefined) {
      return NextResponse.json({ error: "etapeId, actionId et valeur requis" }, { status: 400 });
    }

    const etatActuel: EtatSession = JSON.parse(session.etat);
    const nouvelEtat = enregistrerReponse(etatActuel, body.etapeId, body.actionId, body.valeur);

    const updated = await prisma.sessionProcedure.update({
      where: { id },
      data: { etat: JSON.stringify(nouvelEtat) },
    });

    return NextResponse.json(dbToSession(updated));
  }

  // ── Avancement d'étape ──────────────────────────────────────────────────────
  if (body.action === "avancer") {
    if (body.etapeIndex === undefined || typeof body.etapeIndex !== "number") {
      return NextResponse.json({ error: "etapeIndex requis" }, { status: 400 });
    }

    const updated = await prisma.sessionProcedure.update({
      where: { id },
      data: { etapeIndex: body.etapeIndex },
    });

    return NextResponse.json(dbToSession(updated));
  }

  // ── Abandon ─────────────────────────────────────────────────────────────────
  if (body.action === "abandonner") {
    const updated = await prisma.sessionProcedure.update({
      where: { id },
      data: { statut: "abandonnee", completedAt: new Date() },
    });

    return NextResponse.json(dbToSession(updated));
  }

  return NextResponse.json({ error: `Action '${body.action}' inconnue` }, { status: 400 });
}

// ─── Sérialisation DB → JSON ───────────────────────────────────────────────────

function dbToSession(row: {
  id: string; procedureId: string; procedureVersion: string; procedureSnapshot: string;
  posteId: string; posteSlug: string; agentNom: string | null;
  statut: string; etapeIndex: number; etat: string; synthese: string | null;
  startedAt: Date; completedAt: Date | null;
}) {
  return {
    id: row.id,
    procedureId: row.procedureId,
    procedureVersion: row.procedureVersion,
    procedureSnapshot: JSON.parse(row.procedureSnapshot),
    posteId: row.posteId,
    posteSlug: row.posteSlug,
    agentNom: row.agentNom ?? undefined,
    statut: row.statut,
    etapeIndex: row.etapeIndex,
    etat: JSON.parse(row.etat) as EtatSession,
    synthese: row.synthese ? JSON.parse(row.synthese) : undefined,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}
