import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const mnemoniques = await prisma.mnemonique.findMany({ orderBy: { acronyme: "asc" } });
  return NextResponse.json(mnemoniques);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { acronyme, titre, description, lettres, contexte, couleur } = body;
  if (!acronyme || !titre || !description || !lettres) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  const mnemonique = await prisma.mnemonique.create({
    data: {
      acronyme, titre, description, contexte: contexte || null, couleur: couleur || null,
      lettres: typeof lettres === "string" ? lettres : JSON.stringify(lettres),
    },
  });
  return NextResponse.json(mnemonique, { status: 201 });
}
