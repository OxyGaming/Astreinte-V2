import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getSessionById, addCommentLog } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/comments  → add a comment to the journal
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (session.status === "archived") {
    return NextResponse.json({ error: "Session archivée — modifications impossibles" }, { status: 400 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  await addCommentLog(id, session.ficheSlug, user.id, message.trim());
  return NextResponse.json({ ok: true }, { status: 201 });
}
