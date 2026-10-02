import { NextRequest, NextResponse } from "next/server";
import { guardUser } from "@/lib/tournee/http";
import { creerRealisation, TourneeError } from "@/lib/tournee/realisation";

/** POST — démarre une réalisation (solo ou équipe) à partir d'un modèle publié. */
export async function POST(req: NextRequest) {
  const g = await guardUser();
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  try {
    const r = await creerRealisation(g.user, {
      modeleId: String(body?.modeleId ?? ""),
      mode: body?.mode,
      date: body?.date,
      heureDepart: body?.heureDepart,
      clientOpId: typeof body?.clientOpId === "string" ? body.clientOpId : undefined,
    });
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    if (e instanceof TourneeError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
