import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const abreviations = await prisma.abreviation.findMany({ orderBy: { sigle: "asc" } });
  return NextResponse.json(abreviations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sigle, definition } = body;
  if (!sigle || !definition) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  const existing = await prisma.abreviation.findUnique({ where: { sigle: sigle.toUpperCase() } });
  if (existing) return NextResponse.json({ error: "Sigle déjà existant" }, { status: 409 });

  const abreviation = await prisma.abreviation.create({
    data: { sigle: sigle.toUpperCase(), definition },
  });
  return NextResponse.json(abreviation, { status: 201 });
}
