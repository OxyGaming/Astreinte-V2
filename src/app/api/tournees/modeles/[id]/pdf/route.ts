import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardUser } from "@/lib/tournee/http";
import { buildPlanFromModele, masquerPlan } from "@/lib/tournee/server";
import { parisYmd } from "@/lib/tournee/time";
import { genererPdf, nomFichier } from "@/lib/tournee/pdf";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET — PDF d'un modèle de tournée (programme théorique « Jour J »). */
export async function GET(req: NextRequest, { params }: Params) {
  const g = await guardUser();
  if (g.error) return g.error;
  const { id } = await params;
  const m = await prisma.tourneeModele.findUnique({ where: { id }, select: { statut: true } });
  if (!m || (m.statut !== "PUBLIE" && g.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  }
  const raw = await buildPlanFromModele(id);
  if (!raw) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  const plan = masquerPlan(raw, g.user.role === "ADMIN");
  const buf = await genererPdf({ plan, date: null, heureDepart: plan.heureDepart, dateRef: parisYmd(Date.now()) });
  const download = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${nomFichier(plan.titre, null)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
