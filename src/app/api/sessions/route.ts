import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { createFicheSession, getActiveSession, getAllSessions } from "@/lib/db";
import { validateSessionCreate } from "@/lib/validate";

// GET /api/sessions?ficheSlug=xxx  → active session for this fiche
// GET /api/sessions                → all sessions (active + archived)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const ficheSlug = req.nextUrl.searchParams.get("ficheSlug");
  if (ficheSlug) {
    // Validation basique du slug passé en query string
    if (!/^[a-z0-9-]{1,120}$/.test(ficheSlug)) {
      return NextResponse.json({ error: "Paramètre ficheSlug invalide" }, { status: 400 });
    }
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide" }, { status: 400 });
  }

  const data = validateSessionCreate(body);
  if (!data) {
    return NextResponse.json({ error: "ficheSlug et ficheTitre requis et valides" }, { status: 400 });
  }

  // Evite de créer une session doublon
  const existing = await getActiveSession(data.ficheSlug);
  if (existing) {
    return NextResponse.json({ session: existing });
  }

  const session = await createFicheSession(data.ficheSlug, data.ficheTitre, user.id);
  return NextResponse.json({ session }, { status: 201 });
}
