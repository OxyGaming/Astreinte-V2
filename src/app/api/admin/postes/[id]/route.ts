import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const poste = await prisma.poste.findUnique({
    where: { id },
    include: {
      secteurs: { include: { secteur: { select: { id: true, slug: true, nom: true } } } },
    },
  });
  if (!poste) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(poste);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  // Seuls les champs scalaires restent ici.
  // Exclus (routes dédiées) : annuaire, pnSensibles, proceduresCles, circuitsVoie,
  //                           particularites, dbc, rex
  const {
    slug, nom, typePoste, lignes, adresse, horaires, electrification, systemeBlock,
    secteurIds,
  } = body;

  const ids: string[] = Array.isArray(secteurIds) ? secteurIds : [];

  const poste = await prisma.poste.update({
    where: { id },
    data: {
      slug, nom, typePoste, adresse, horaires, electrification, systemeBlock,
      lignes: typeof lignes === "string" ? lignes : JSON.stringify(lignes || []),
      secteurs: {
        deleteMany: {},
        create: ids.map((secteurId) => ({ secteurId })),
      },
    },
  });
  return NextResponse.json(poste);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.poste.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
