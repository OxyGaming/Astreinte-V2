import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const m = await prisma.mnemonique.findUnique({ where: { id } });
  if (!m) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(m);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { acronyme, titre, description, lettres, contexte, couleur } = body;
  const m = await prisma.mnemonique.update({
    where: { id },
    data: {
      acronyme, titre, description, contexte: contexte || null, couleur: couleur || null,
      lettres: typeof lettres === "string" ? lettres : JSON.stringify(lettres),
    },
  });
  return NextResponse.json(m);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.mnemonique.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
