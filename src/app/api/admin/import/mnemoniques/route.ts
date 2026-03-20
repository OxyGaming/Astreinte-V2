import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

interface LettreData {
  lettre: string;
  signification: string;
  detail?: string;
}

interface MnemoniqueData {
  acronyme: string;
  titre: string;
  description: string;
  contexte?: string;
  couleur?: string;
  lettres: LettreData[];
}

const COULEURS = ["blue", "amber", "red", "green", "purple", ""];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mnemoniques: MnemoniqueData[] = body.mnemoniques;
    const mode: "create" | "upsert" = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(mnemoniques) || mnemoniques.length === 0) {
      return NextResponse.json({ error: "Aucun mnémonique à importer." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { acronyme: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const m of mnemoniques) {
      try {
        if (!m.acronyme?.trim() || !m.titre?.trim() || !m.description?.trim()) {
          rejected++;
          details.push({ acronyme: m.acronyme || "?", status: "rejected", reason: "Champs obligatoires manquants (acronyme, titre, description)" });
          continue;
        }
        if (m.couleur && !COULEURS.includes(m.couleur)) {
          rejected++;
          details.push({ acronyme: m.acronyme, status: "rejected", reason: `Couleur invalide "${m.couleur}" (valeurs : blue, amber, red, green, purple)` });
          continue;
        }

        const lettresJson = JSON.stringify(
          (m.lettres || []).map((l) => ({
            lettre: l.lettre?.trim() || "",
            signification: l.signification?.trim() || "",
            ...(l.detail?.trim() ? { detail: l.detail.trim() } : {}),
          }))
        );

        const existing = await prisma.mnemonique.findFirst({
          where: { acronyme: { equals: m.acronyme.trim() } },
        });

        const data = {
          acronyme: m.acronyme.trim(),
          titre: m.titre.trim(),
          description: m.description.trim(),
          contexte: m.contexte?.trim() || null,
          couleur: m.couleur?.trim() || null,
          lettres: lettresJson,
        };

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ acronyme: m.acronyme, status: "rejected", reason: "Mnémonique déjà existant (même acronyme)" });
            continue;
          }
          await prisma.mnemonique.update({ where: { id: existing.id }, data });
          updated++;
          details.push({ acronyme: m.acronyme, status: "updated" });
        } else {
          await prisma.mnemonique.create({ data });
          created++;
          details.push({ acronyme: m.acronyme, status: "created" });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ acronyme: m.acronyme || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    revalidatePath("/mnemoniques");
    revalidatePath("/");
    revalidatePath("/recherche");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des mnémoniques." }, { status: 500 });
  }
}
