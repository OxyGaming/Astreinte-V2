import { NextRequest, NextResponse } from "next/server";
import { guardUser } from "@/lib/tournee/http";
import { loadRealisation } from "@/lib/tournee/server";
import { ajouterEvenements, TourneeError } from "@/lib/tournee/realisation";

type Params = { params: Promise<{ id: string }> };

/** POST {events:[{type, etapeKey, at, clientOpId}]} — progression du participant courant. */
export async function POST(req: NextRequest, { params }: Params) {
  const g = await guardUser();
  if (g.error) return g.error;
  const { id } = await params;
  const r = await loadRealisation(id);
  if (!r) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  try {
    const res = await ajouterEvenements(g.user, r, body?.events);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof TourneeError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
