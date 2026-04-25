import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canAccessSession } from "@/lib/user-auth";
import { getSessionById, archiveFicheSession, getSessionJournal } from "@/lib/db";

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
