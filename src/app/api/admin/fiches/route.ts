import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const fiches = await prisma.fiche.findMany({
    orderBy: { numero: "asc" },
    include: {
      contacts: { include: { contact: { select: { id: true, nom: true } } } },
      secteurs: { include: { secteur: { select: { id: true, nom: true } } } },
    },
  });
  return NextResponse.json(fiches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, numero, titre, categorie, priorite, mnemonique, resume, etapes, references, avisObligatoires, featured, contactIds, secteurIds } = body;

  if (!slug || !numero || !titre || !categorie || !priorite || !resume || !etapes) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  // Vérifier unicité slug et numero
  const existing = await prisma.fiche.findFirst({ where: { OR: [{ slug }, { numero: Number(numero) }] } });
  if (existing) return NextResponse.json({ error: "Slug ou numéro déjà utilisé" }, { status: 409 });

  const fiche = await prisma.fiche.create({
    data: {
      slug, numero: Number(numero), titre, categorie, priorite,
      mnemonique: mnemonique || null, resume, featured: featured === true,
      etapes: typeof etapes === "string" ? etapes : JSON.stringify(etapes),
      references: references ? (typeof references === "string" ? references : JSON.stringify(references)) : null,
      avisObligatoires: avisObligatoires ? (typeof avisObligatoires === "string" ? avisObligatoires : JSON.stringify(avisObligatoires)) : null,
      contacts: {
        create: (contactIds || []).map((contactId: string) => ({ contactId })),
      },
      secteurs: {
        create: (secteurIds || []).map((secteurId: string) => ({ secteurId })),
      },
    },
    include: {
      contacts: { include: { contact: { select: { id: true, nom: true } } } },
      secteurs: { include: { secteur: { select: { id: true, nom: true } } } },
    },
  });

  return NextResponse.json(fiche, { status: 201 });
}
