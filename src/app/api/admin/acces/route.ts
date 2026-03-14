import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const ligne = searchParams.get("ligne") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1") || 1;
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (ligne) where.ligne = ligne;
  if (q) {
    where.OR = [
      { nomComplet: { contains: q } },
      { pk: { contains: q } },
      { identifiant: { contains: q } },
      { type: { contains: q } },
    ];
  }

  const [total, points] = await Promise.all([
    prisma.accesRail.count({ where }),
    prisma.accesRail.findMany({
      where,
      orderBy: [{ ligne: "asc" }, { pk: "asc" }],
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ points, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ligne, pk, nomAffiche, nomComplet, latitude, longitude, type, identifiant, description } = body;

  if (!ligne || !pk || !nomAffiche || !nomComplet || latitude == null || longitude == null) {
    return NextResponse.json({ error: "Champs obligatoires manquants (ligne, pk, nomAffiche, nomComplet, latitude, longitude)" }, { status: 400 });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Latitude et longitude invalides" }, { status: 400 });
  }

  const point = await prisma.accesRail.create({
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
      source: "BACKOFFICE",
    },
  });

  return NextResponse.json(point, { status: 201 });
}
