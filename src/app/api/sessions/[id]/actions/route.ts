import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getSessionById, addActionLog, getSessionJournal } from "@/lib/db";
import { validateActionLog } from "@/lib/validate";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/actions  → log an action (check/uncheck)
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (session.status === "archived") {
    return NextResponse.json({ error: "Session archivée — modifications impossibles" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide" }, { status: 400 });
  }

  const data = validateActionLog(body);
  if (!data) {
    return NextResponse.json({ error: "Données manquantes ou invalides" }, { status: 400 });
  }

  await addActionLog(
    id,
    session.ficheSlug,
    data.etapeOrdre,
    data.actionIndex,
    data.actionLabel,
    user.id,
    data.type
  );
  const journal = await getSessionJournal(id);
  return NextResponse.json({ ok: true, journal }, { status: 201 });
}
