import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardUser } from "@/lib/tournee/http";
import { loadRealisation, realisationAccess } from "@/lib/tournee/server";
import { buildRealisationView, TourneeError } from "@/lib/tournee/realisation";
import { ajusterPlan } from "@/lib/tournee/ajustement";

type Params = { params: Promise<{ id: string }> };

const fail = (e: unknown) => {
  if (e instanceof TourneeError) return NextResponse.json({ error: e.message }, { status: e.status });
  throw e;
};

/** GET — vue complète (plan figé, participants, journaux). Sert aussi au polling. */
export async function GET(_req: NextRequest, { params }: Params) {
  const g = await guardUser();
  if (g.error) return g.error;
  const { id } = await params;
  const r = await loadRealisation(id);
  if (!r) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  try {
    return NextResponse.json(await buildRealisationView(g.user, r), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

/**
 * PATCH — gestion par le référent :
 *   { action: "lancer" | "terminer" | "annuler" }
 *   { action: "ajuster", date?, heureDepart?, etapes? }  (PREPARATION uniquement)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guardUser();
  if (g.error) return g.error;
  const { id } = await params;
  const r = await loadRealisation(id);
  if (!r) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  const access = realisationAccess(g.user, r);
  if (!access.isReferent && g.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé au référent de la tournée" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const cloturee = r.statut === "TERMINEE" || r.statut === "ANNULEE";

  try {
    switch (body?.action) {
      case "lancer":
        if (r.statut !== "PREPARATION") throw new TourneeError(409, "La tournée est déjà lancée");
        await prisma.tourneeRealisation.update({ where: { id }, data: { statut: "EN_COURS", startedAt: new Date() } });
        break;
      case "terminer":
        if (cloturee) throw new TourneeError(409, "Tournée déjà clôturée");
        await prisma.tourneeRealisation.update({ where: { id }, data: { statut: "TERMINEE", endedAt: new Date() } });
        break;
      case "annuler":
        if (cloturee) throw new TourneeError(409, "Tournée déjà clôturée");
        await prisma.tourneeRealisation.update({ where: { id }, data: { statut: "ANNULEE", endedAt: new Date() } });
        break;
      case "ajuster":
        if (r.statut !== "PREPARATION") throw new TourneeError(409, "Le parcours ne peut plus être modifié après le lancement");
        await ajusterPlan(r, body);
        break;
      default:
        throw new TourneeError(400, "Action inconnue");
    }
    const updated = await loadRealisation(id);
    return NextResponse.json(await buildRealisationView(g.user, updated!));
  } catch (e) {
    return fail(e);
  }
}
