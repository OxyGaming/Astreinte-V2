import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const fiche = await prisma.fiche.findUnique({
    where: { id },
    include: {
      contacts: { include: { contact: true } },
      secteurs: { include: { secteur: true } },
    },
  });
  if (!fiche) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(fiche);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { slug, numero, titre, categorie, priorite, mnemonique, resume, etapes, references, avisObligatoires, featured, contactIds, secteurIds } = body;

  // Mettre à jour les relations en cascade
  await prisma.ficheContact.deleteMany({ where: { ficheId: id } });
  await prisma.ficheSecteur.deleteMany({ where: { ficheId: id } });

  const fiche = await prisma.fiche.update({
    where: { id },
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

  return NextResponse.json(fiche);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.ficheContact.deleteMany({ where: { ficheId: id } });
  await prisma.ficheSecteur.deleteMany({ where: { ficheId: id } });
  await prisma.fiche.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
