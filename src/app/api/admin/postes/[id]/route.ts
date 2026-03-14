import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const poste = await prisma.poste.findUnique({
    where: { id },
    include: { secteur: { select: { id: true, slug: true, nom: true } } },
  });
  if (!poste) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(poste);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    slug, nom, typePoste, lignes, adresse, horaires, electrification, systemeBlock,
    annuaire, circuitsVoie, pnSensibles, particularites, proceduresCles, dbc, rex, secteurId,
  } = body;

  const poste = await prisma.poste.update({
    where: { id },
    data: {
      slug, nom, typePoste, adresse, horaires, electrification, systemeBlock,
      lignes: typeof lignes === "string" ? lignes : JSON.stringify(lignes || []),
      annuaire: typeof annuaire === "string" ? annuaire : JSON.stringify(annuaire || []),
      circuitsVoie: typeof circuitsVoie === "string" ? circuitsVoie : JSON.stringify(circuitsVoie || []),
      pnSensibles: typeof pnSensibles === "string" ? pnSensibles : JSON.stringify(pnSensibles || []),
      particularites: typeof particularites === "string" ? particularites : JSON.stringify(particularites || []),
      proceduresCles: typeof proceduresCles === "string" ? proceduresCles : JSON.stringify(proceduresCles || []),
      dbc: dbc ? (typeof dbc === "string" ? dbc : JSON.stringify(dbc)) : null,
      rex: rex ? (typeof rex === "string" ? rex : JSON.stringify(rex)) : null,
      secteurId: secteurId || null,
    },
  });
  return NextResponse.json(poste);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.poste.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
