import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { validatePkInput } from "@/lib/pkUtils";

interface PointPayload {
  nomComplet: string;
  nomAffiche: string;
  latitude: number;
  longitude: number;
  type?: string | null;
  identifiant?: string | null;
  pk: string;
  ligne: string;
  description?: string | null;
}

export async function POST(req: NextRequest) {
  await requireAdminSession();
  try {
    const body = await req.json();
    const points: PointPayload[] = body.points;

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: "Aucun point à importer." }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const p of points) {
      try {
        if (!p.ligne?.trim()) {
          errors.push(`Point "${p.nomComplet}" ignoré : ligne manquante`);
          continue;
        }
        if (p.latitude == null || p.longitude == null || isNaN(p.latitude) || isNaN(p.longitude)) {
          errors.push(`Point "${p.nomComplet}" ignoré : coordonnées invalides`);
          continue;
        }
        if (p.latitude < -90 || p.latitude > 90 || p.longitude < -180 || p.longitude > 180) {
          errors.push(`Point "${p.nomComplet}" ignoré : coordonnées hors bornes`);
          continue;
        }
        if (p.pk?.trim() && validatePkInput(p.pk) !== null) {
          errors.push(`Point "${p.nomComplet}" ignoré : PK "${p.pk}" au format invalide`);
          continue;
        }

        // Vérifier si un point très proche existe déjà (tolérance 0.0001° ≈ 10m)
        const existing = await prisma.accesRail.findFirst({
          where: {
            ligne: p.ligne,
            latitude: { gte: p.latitude - 0.0001, lte: p.latitude + 0.0001 },
            longitude: { gte: p.longitude - 0.0001, lte: p.longitude + 0.0001 },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.accesRail.create({
          data: {
            nomComplet: p.nomComplet,
            nomAffiche: p.nomAffiche || p.nomComplet,
            latitude: p.latitude,
            longitude: p.longitude,
            type: p.type || null,
            identifiant: p.identifiant || null,
            pk: p.pk || "",
            ligne: p.ligne,
            description: p.description || null,
            source: "KML",
          },
        });
        imported++;
      } catch {
        errors.push(`Erreur pour "${p.nomComplet}"`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import KML." }, { status: 500 });
  }
}
