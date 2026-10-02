import { NextRequest, NextResponse } from "next/server";
import { guardUser } from "@/lib/tournee/http";
import { loadRealisation, realisationAccess } from "@/lib/tournee/server";
import { buildRealisationView, TourneeError } from "@/lib/tournee/realisation";
import { genererPdf, nomFichier } from "@/lib/tournee/pdf";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * GET — PDF d'une réalisation : programme à la date réelle, détail, contacts,
 * et restitution du temps des participants ayant démarré.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const g = await guardUser();
  if (g.error) return g.error;
  const { id } = await params;
  const r = await loadRealisation(id);
  if (!r || !realisationAccess(g.user, r).canView) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  try {
    const view = await buildRealisationView(g.user, r);
    const buf = await genererPdf({
      plan: view.plan,
      date: view.date,
      heureDepart: view.heureDepart,
      dateRef: view.date,
      participants: view.participants.map((p) => ({ nom: p.nom, events: p.events })),
    });
    const download = req.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${nomFichier(view.titre, view.date)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof TourneeError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
