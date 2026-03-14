import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const secteurs = await prisma.secteur.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(secteurs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, nom, ligne, trajet, description, pointsAcces, procedures, pn } = body;
  if (!slug || !nom || !ligne || !trajet || !description) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  const existing = await prisma.secteur.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });

  const secteur = await prisma.secteur.create({
    data: {
      slug, nom, ligne, trajet, description,
      pointsAcces: typeof pointsAcces === "string" ? pointsAcces : JSON.stringify(pointsAcces || []),
      procedures: typeof procedures === "string" ? procedures : JSON.stringify(procedures || []),
      pn: pn ? (typeof pn === "string" ? pn : JSON.stringify(pn)) : null,
    },
  });
  return NextResponse.json(secteur, { status: 201 });
}
