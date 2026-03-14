import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const point = await prisma.accesRail.findUnique({ where: { id } });
  if (!point) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(point);
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();
  const { ligne, pk, nomAffiche, nomComplet, latitude, longitude, type, identifiant, description } = body;

  if (!ligne || !pk || !nomAffiche || !nomComplet || latitude == null || longitude == null) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Latitude et longitude invalides" }, { status: 400 });
  }

  const existing = await prisma.accesRail.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

  const updated = await prisma.accesRail.update({
    where: { id },
    data: {
      ligne: String(ligne),
      pk: String(pk),
      nomAffiche: String(nomAffiche),
      nomComplet: String(nomComplet),
      latitude: lat,
      longitude: lon,
      type: type ? String(type) : null,
      identifiant: identifiant ? String(identifiant) : null,
      description: description ? String(description) : null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const existing = await prisma.accesRail.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  await prisma.accesRail.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
