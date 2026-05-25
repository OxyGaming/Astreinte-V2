import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LIEN_ICONS, LIEN_COLORS } from "@/lib/lien-ui";

interface LienCategorieInput {
  nom: string;
  icon?: string;
  couleur?: string;
  ordre?: number;
}

type ImportMode = "create" | "upsert";

const ICONS = new Set(LIEN_ICONS.map((i) => i.value));
const COULEURS = new Set(LIEN_COLORS.map((c) => c.value));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const categories: LienCategorieInput[] = body.categories;
    const mode: ImportMode = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: "Aucune thématique à importer." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { nom: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const c of categories) {
      try {
        const nom = c.nom?.trim();
        if (!nom) {
          rejected++;
          details.push({ nom: c.nom || "?", status: "rejected", reason: "Nom manquant" });
          continue;
        }
        const icon = c.icon?.trim() || "Link2";
        const couleur = c.couleur?.trim() || "blue";
        if (!ICONS.has(icon)) {
          rejected++;
          details.push({ nom, status: "rejected", reason: `Icône inconnue : "${icon}"` });
          continue;
        }
        if (!COULEURS.has(couleur)) {
          rejected++;
          details.push({ nom, status: "rejected", reason: `Couleur inconnue : "${couleur}"` });
          continue;
        }
        const ordre = Number.isFinite(c.ordre) ? Number(c.ordre) : 0;

        const existing = await prisma.lienCategorie.findFirst({ where: { nom } });
        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ nom, status: "rejected", reason: "Thématique déjà existante (même nom)" });
            continue;
          }
          await prisma.lienCategorie.update({ where: { id: existing.id }, data: { icon, couleur, ordre } });
          updated++;
          details.push({ nom, status: "updated" });
        } else {
          await prisma.lienCategorie.create({ data: { nom, icon, couleur, ordre } });
          created++;
          details.push({ nom, status: "created" });
        }
      } catch (e) {
        rejected++;
        details.push({
          nom: c.nom || "?",
          status: "rejected",
          reason: e instanceof Error ? e.message : "Erreur inconnue",
        });
      }
    }

    revalidatePath("/liens-utiles");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des thématiques." }, { status: 500 });
  }
}
