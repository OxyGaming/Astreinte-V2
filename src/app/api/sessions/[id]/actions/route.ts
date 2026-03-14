import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getSessionById, addActionLog } from "@/lib/db";

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

  const { etapeOrdre, actionIndex, actionLabel, type } = await req.json();
  if (etapeOrdre == null || actionIndex == null || !actionLabel || !type) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  await addActionLog(id, session.ficheSlug, etapeOrdre, actionIndex, actionLabel, user.id, type);
  return NextResponse.json({ ok: true }, { status: 201 });
}
