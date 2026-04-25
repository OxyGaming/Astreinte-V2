import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { validatePkInput } from "@/lib/pkUtils";
import { distanceMeters } from "@/lib/geo";

interface AccesData {
  ligne: string;
  pk: string;
  type?: string;
  identifiant?: string;
  nomAffiche: string;
  nomComplet: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export async function POST(req: NextRequest) {
  await requireAdminSession();
  try {
    const body = await req.json();
    const points: AccesData[] = body.points;
    const mode: "create" | "upsert" = body.mode === "create" ? "create" : "upsert";
    const TOLERANCE_M = 10;

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: "Aucun point à importer." }, { status: 400 });
    }

    const existing = await prisma.accesRail.findMany({
      select: { id: true, latitude: true, longitude: true, nomComplet: true },
    });

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { nom: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const p of points) {
      try {
        if (!p.ligne?.trim() || !p.pk?.trim() || !p.nomAffiche?.trim() || !p.nomComplet?.trim()) {
          rejected++;
          details.push({ nom: p.nomAffiche || "?", status: "rejected", reason: "Champs obligatoires manquants (ligne, pk, nomAffiche, nomComplet)" });
          continue;
        }
        const pkErr = validatePkInput(p.pk);
        if (pkErr) {
          rejected++;
          details.push({ nom: p.nomAffiche, status: "rejected", reason: `PK "${p.pk}" invalide : ${pkErr}` });
          continue;
        }
        const lat = Number(p.latitude);
        const lon = Number(p.longitude);
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          rejected++;
          details.push({ nom: p.nomAffiche, status: "rejected", reason: "Coordonnées GPS invalides" });
          continue;
        }

        // Chercher un doublon par nom ou par proximité GPS
        const duplicate = existing.find(
          (e) =>
            e.nomComplet === p.nomComplet.trim() ||
            distanceMeters(e.latitude, e.longitude, lat, lon) < TOLERANCE_M
        );

        const data = {
          ligne: p.ligne.trim(),
          pk: p.pk.trim(),
          type: p.type?.trim() || null,
          identifiant: p.identifiant?.trim() || null,
          nomAffiche: p.nomAffiche.trim(),
          nomComplet: p.nomComplet.trim(),
          latitude: lat,
          longitude: lon,
          description: p.description?.trim() || null,
          source: "BACKOFFICE" as const,
        };

        if (duplicate) {
          if (mode === "create") {
            rejected++;
            details.push({ nom: p.nomAffiche, status: "rejected", reason: "Point déjà existant (doublon GPS ou nom)" });
            continue;
          }
          await prisma.accesRail.update({ where: { id: duplicate.id }, data });
          updated++;
          details.push({ nom: p.nomAffiche, status: "updated" });
        } else {
          await prisma.accesRail.create({ data });
          existing.push({ id: "", latitude: lat, longitude: lon, nomComplet: p.nomComplet.trim() });
          created++;
          details.push({ nom: p.nomAffiche, status: "created" });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ nom: p.nomAffiche || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    revalidatePath("/acces");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des points d'accès." }, { status: 500 });
  }
}
