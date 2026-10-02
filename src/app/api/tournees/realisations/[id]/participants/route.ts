import { NextRequest, NextResponse } from "next/server";
import { guardUser } from "@/lib/tournee/http";
import { loadRealisation } from "@/lib/tournee/server";
import { buildRealisationView, rejoindreRealisation, TourneeError } from "@/lib/tournee/realisation";

type Params = { params: Promise<{ id: string }> };

/** POST — l'utilisateur courant rejoint la tournée d'équipe (lien direct). */
export async function POST(_req: NextRequest, { params }: Params) {
  const g = await guardUser();
  if (g.error) return g.error;
  const { id } = await params;
  const r = await loadRealisation(id);
  if (!r) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  try {
    await rejoindreRealisation(g.user, r);
    const updated = await loadRealisation(id);
    return NextResponse.json(await buildRealisationView(g.user, updated!));
  } catch (e) {
    if (e instanceof TourneeError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
