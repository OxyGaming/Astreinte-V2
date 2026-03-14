import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const secteur = await prisma.secteur.findUnique({
    where: { id },
    include: { fiches: { include: { fiche: { select: { id: true, titre: true, slug: true } } } } },
  });
  if (!secteur) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(secteur);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { slug, nom, ligne, trajet, description, pointsAcces, procedures, pn } = body;

  const secteur = await prisma.secteur.update({
    where: { id },
    data: {
      slug, nom, ligne, trajet, description,
      pointsAcces: typeof pointsAcces === "string" ? pointsAcces : JSON.stringify(pointsAcces || []),
      procedures: typeof procedures === "string" ? procedures : JSON.stringify(procedures || []),
      pn: pn ? (typeof pn === "string" ? pn : JSON.stringify(pn)) : null,
    },
  });
  return NextResponse.json(secteur);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  // Vérifier si des fiches ou postes référencent ce secteur
  const fichesCount = await prisma.ficheSecteur.count({ where: { secteurId: id } });
  const postesCount = await prisma.poste.count({ where: { secteurId: id } });
  if (fichesCount > 0 || postesCount > 0) {
    return NextResponse.json({
      error: `Impossible de supprimer : ${fichesCount} fiche(s) et ${postesCount} poste(s) référencent ce secteur.`,
      fichesCount, postesCount,
    }, { status: 409 });
  }
  await prisma.secteur.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
