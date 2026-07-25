import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canAccessSession } from "@/lib/user-auth";
import { getSessionById, archiveFicheSession, getSessionJournal } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { executeDeletion, deletionErrorResponse, parseDeletionBody } from "@/lib/triangle";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]  → session + journal (cloisonnement par utilisateur)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (!canAccessSession(user, session)) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  const journal = await getSessionJournal(id);
  return NextResponse.json({ session, journal });
}

// PUT /api/sessions/[id]  → archive session
// Autorisé : ADMIN, EDITOR, ou le USER qui a créé la session
export async function PUT(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const isOwner = session.createdByUserId === user.id;
  const hasRole = user.role === "ADMIN" || user.role === "EDITOR";
  if (!isOwner && !hasRole) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  if (session.status === "archived") {
    return NextResponse.json({ error: "Session déjà archivée" }, { status: 400 });
  }

  const updated = await archiveFicheSession(id);
  return NextResponse.json({ session: updated });
}

// DELETE /api/sessions/[id]  → suppression PHYSIQUE (admin-only)
// Gardes : refus si un RCI FINAL ou un Livret CLOSED directement rattaché serait
// altéré ; contrôle d'obsolescence via `stateToken` ; audit dans la transaction.
// Cible uniquement `FicheSession` (jamais `SessionProcedure`).
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Suppression réservée aux administrateurs" }, { status: 403 });
  }

  const { id } = await params;

  const { stateToken, motif } = await parseDeletionBody(req);
  if (!stateToken) {
    return NextResponse.json({ error: "Jeton d'état (stateToken) requis" }, { status: 400 });
  }

  const actor = { id: user.id, nom: `${user.prenom} ${user.nom}`.trim() || user.username };

  try {
    const impact = await prisma.$transaction((tx) =>
      executeDeletion(tx, "session", id, actor, stateToken, motif),
    );
    return NextResponse.json({ ok: true, impact });
  } catch (e) {
    const res = deletionErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
