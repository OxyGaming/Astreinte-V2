import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { createFicheSession, getActiveSession, getAllSessions } from "@/lib/db";

// GET /api/sessions?ficheSlug=xxx  → active session for this fiche
// GET /api/sessions                → all sessions (active + archived)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const ficheSlug = req.nextUrl.searchParams.get("ficheSlug");
  if (ficheSlug) {
    const session = await getActiveSession(ficheSlug);
    return NextResponse.json({ session });
  }

  const sessions = await getAllSessions();
  return NextResponse.json({ sessions });
}

// POST /api/sessions  → create session
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { ficheSlug, ficheTitre } = await req.json();
  if (!ficheSlug || !ficheTitre) {
    return NextResponse.json({ error: "ficheSlug et ficheTitre requis" }, { status: 400 });
  }

  // Check if already an active session
  const existing = await getActiveSession(ficheSlug);
  if (existing) {
    return NextResponse.json({ session: existing });
  }

  const session = await createFicheSession(ficheSlug, ficheTitre, user.id);
  return NextResponse.json({ session }, { status: 201 });
}
