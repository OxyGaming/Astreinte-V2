import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";

interface MainCouranteImportRow {
  titre: string;
  description: string;
  editedDescription?: string;
  ficheSlug?: string;
}

// POST /api/admin/import/main-courante
// Importe des entrées main courante validées en masse.
// L'admin connecté devient auteur et validateur de toutes les entrées importées.
export async function POST(req: NextRequest) {
  await requireAdminSession();

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { entries, mode } = body as { entries: MainCouranteImportRow[]; mode: "create" | "upsert" };
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "Aucune entrée fournie" }, { status: 400 });
  }

  const now = new Date();
  let created = 0;
  let updated = 0;
  let rejected = 0;
  const details: { status: string; reason?: string }[] = [];

  for (const row of entries) {
    const titre = row.titre?.trim();
    const description = row.description?.trim();
    if (!titre || !description) {
      rejected++;
      details.push({ status: "rejected", reason: `Titre ou description manquant : "${titre || "—"}"` });
      continue;
    }

    try {
      if (mode === "upsert") {
        // Cherche une entrée existante avec le même titre (correspondance exacte)
        const existing = await prisma.mainCourante.findFirst({
          where: { titre, auteurId: user.id },
        });

        if (existing) {
          await prisma.mainCourante.update({
            where: { id: existing.id },
            data: {
              description,
              editedDescription: row.editedDescription?.trim() || null,
              ficheSlug: row.ficheSlug?.trim() || null,
              status: "validated",
              validatedAt: now,
              validatedByUserId: user.id,
            },
          });
          updated++;
          details.push({ status: "updated" });
          continue;
        }
      }

      await prisma.mainCourante.create({
        data: {
          titre,
          description,
          editedDescription: row.editedDescription?.trim() || null,
          ficheSlug: row.ficheSlug?.trim() || null,
          auteurId: user.id,
          status: "validated",
          validatedAt: now,
          validatedByUserId: user.id,
        },
      });
      created++;
      details.push({ status: "created" });
    } catch {
      rejected++;
      details.push({ status: "rejected", reason: `Erreur lors de l'import de "${titre}"` });
    }
  }

  return NextResponse.json({ created, updated, rejected, details });
}
