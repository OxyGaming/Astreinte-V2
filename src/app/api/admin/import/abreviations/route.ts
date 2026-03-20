import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

interface AbreviationData {
  sigle: string;
  definition: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const abreviations: AbreviationData[] = body.abreviations;
    const mode: "create" | "upsert" = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(abreviations) || abreviations.length === 0) {
      return NextResponse.json({ error: "Aucune abréviation à importer." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { sigle: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const a of abreviations) {
      try {
        if (!a.sigle?.trim() || !a.definition?.trim()) {
          rejected++;
          details.push({ sigle: a.sigle || "?", status: "rejected", reason: "Champs obligatoires manquants (sigle, definition)" });
          continue;
        }

        const existing = await prisma.abreviation.findUnique({
          where: { sigle: a.sigle.trim() },
        });

        const data = {
          sigle: a.sigle.trim(),
          definition: a.definition.trim(),
        };

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ sigle: a.sigle, status: "rejected", reason: "Abréviation déjà existante (même sigle)" });
            continue;
          }
          await prisma.abreviation.update({ where: { id: existing.id }, data });
          updated++;
          details.push({ sigle: a.sigle, status: "updated" });
        } else {
          await prisma.abreviation.create({ data });
          created++;
          details.push({ sigle: a.sigle, status: "created" });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ sigle: a.sigle || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    revalidatePath("/recherche");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des abréviations." }, { status: 500 });
  }
}
