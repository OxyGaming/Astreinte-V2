import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const source = await prisma.procedure.findUnique({
    where: { id },
    include: { postes: true },
  });
  if (!source) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Générer un slug unique
  let newSlug = `${source.slug}-copie`;
  let n = 2;
  while (await prisma.procedure.findUnique({ where: { slug: newSlug } })) {
    newSlug = `${source.slug}-copie-${n++}`;
  }

  const copy = await prisma.procedure.create({
    data: {
      slug: newSlug,
      titre: `${source.titre} (copie)`,
      typeProcedure: source.typeProcedure,
      description: source.description,
      version: "1.0",
      etapes: source.etapes,
    },
  });

  return NextResponse.json({ id: copy.id }, { status: 201 });
}
