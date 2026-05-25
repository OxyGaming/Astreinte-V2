import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidHttpUrl } from "@/lib/liens";

interface LienInput {
  libelle: string;
  url: string;
  /** Nom de la thématique parente (résolu en `categorieId`). Vide ⇒ aucune catégorie. */
  categorie_nom?: string;
  ordre?: number;
}

type ImportMode = "create" | "upsert";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const liens: LienInput[] = body.liens;
    const mode: ImportMode = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(liens) || liens.length === 0) {
      return NextResponse.json({ error: "Aucun lien à importer." }, { status: 400 });
    }

    // Précharger les catégories par nom pour résoudre `categorie_nom`
    const categories = await prisma.lienCategorie.findMany({ select: { id: true, nom: true } });
    const catByNom = new Map(categories.map((c) => [c.nom.toLowerCase(), c.id]));

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { libelle: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const l of liens) {
      try {
        const libelle = l.libelle?.trim();
        const url = l.url?.trim();
        if (!libelle) {
          rejected++;
          details.push({ libelle: l.libelle || "?", status: "rejected", reason: "Libellé manquant" });
          continue;
        }
        if (!isValidHttpUrl(url)) {
          rejected++;
          details.push({ libelle, status: "rejected", reason: "URL invalide (http ou https attendu)" });
          continue;
        }

        let categorieId: string | null = null;
        if (l.categorie_nom?.trim()) {
          const resolved = catByNom.get(l.categorie_nom.trim().toLowerCase());
          if (!resolved) {
            rejected++;
            details.push({ libelle, status: "rejected", reason: `Thématique introuvable : "${l.categorie_nom}"` });
            continue;
          }
          categorieId = resolved;
        }
        const ordre = Number.isFinite(l.ordre) ? Number(l.ordre) : 0;

        // Clé fonctionnelle : (libelle, url, categorieId). Pas d'unique en DB —
        // on déduplique à la main pour rester idempotent sur un réimport.
        const existing = await prisma.lien.findFirst({
          where: { libelle, url, categorieId },
          select: { id: true },
        });

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ libelle, status: "rejected", reason: "Lien identique déjà présent (libellé + URL + thématique)" });
            continue;
          }
          await prisma.lien.update({
            where: { id: existing.id },
            data: { libelle, url, categorieId, ordre },
          });
          updated++;
          details.push({ libelle, status: "updated" });
        } else {
          await prisma.lien.create({
            data: { libelle, url, categorieId, ordre },
          });
          created++;
          details.push({ libelle, status: "created" });
        }
      } catch (e) {
        rejected++;
        details.push({
          libelle: l.libelle || "?",
          status: "rejected",
          reason: e instanceof Error ? e.message : "Erreur inconnue",
        });
      }
    }

    revalidatePath("/liens-utiles");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des liens." }, { status: 500 });
  }
}
