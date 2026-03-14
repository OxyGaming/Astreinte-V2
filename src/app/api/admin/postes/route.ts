import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const postes = await prisma.poste.findMany({
    orderBy: { nom: "asc" },
    include: { secteur: { select: { id: true, slug: true, nom: true } } },
  });
  return NextResponse.json(postes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    slug, nom, typePoste, lignes, adresse, horaires, electrification, systemeBlock,
    annuaire, circuitsVoie, pnSensibles, particularites, proceduresCles, dbc, rex, secteurId,
  } = body;

  if (!slug || !nom || !typePoste || !adresse || !horaires || !electrification || !systemeBlock) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const poste = await prisma.poste.create({
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
  return NextResponse.json(poste, { status: 201 });
}
