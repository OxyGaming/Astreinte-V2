import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface PosteData {
  slug: string;
  nom: string;
  typePoste: string;
  lignes: string[];
  adresse: string;
  horaires: string;
  electrification: string;
  systemeBlock: string;
  secteur_slug?: string;
  particularites: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const postes: PosteData[] = body.postes;
    const mode: "create" | "upsert" = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(postes) || postes.length === 0) {
      return NextResponse.json({ error: "Aucun poste à importer." }, { status: 400 });
    }

    // Précharger les secteurs pour la résolution du slug
    const secteurs = await prisma.secteur.findMany({ select: { id: true, slug: true } });
    const secteurMap = new Map(secteurs.map((s) => [s.slug, s.id]));

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { slug: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const p of postes) {
      try {
        if (!p.slug?.trim() || !p.nom?.trim() || !p.typePoste?.trim()) {
          rejected++;
          details.push({ slug: p.slug || "?", status: "rejected", reason: "Champs obligatoires manquants (slug, nom, typePoste)" });
          continue;
        }

        const secteurId = p.secteur_slug?.trim()
          ? (secteurMap.get(p.secteur_slug.trim()) ?? null)
          : null;

        if (p.secteur_slug?.trim() && !secteurId) {
          rejected++;
          details.push({ slug: p.slug, status: "rejected", reason: `Secteur introuvable : "${p.secteur_slug}"` });
          continue;
        }

        const existing = await prisma.poste.findUnique({ where: { slug: p.slug.trim() } });

        // Pour un poste existant, on préserve les champs JSON complexes (annuaire, circuits, etc.)
        // et on ne met à jour que les champs plats fournis dans le tableur
        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ slug: p.slug, status: "rejected", reason: "Poste déjà existant (même slug)" });
            continue;
          }
          await prisma.poste.update({
            where: { id: existing.id },
            data: {
              nom: p.nom.trim(),
              typePoste: p.typePoste.trim(),
              lignes: JSON.stringify(p.lignes || []),
              adresse: p.adresse?.trim() || existing.adresse,
              horaires: p.horaires?.trim() || existing.horaires,
              electrification: p.electrification?.trim() || existing.electrification,
              systemeBlock: p.systemeBlock?.trim() || existing.systemeBlock,
              particularites: JSON.stringify(p.particularites || []),
              secteurId: secteurId ?? existing.secteurId,
            },
          });
          updated++;
          details.push({ slug: p.slug, status: "updated" });
        } else {
          await prisma.poste.create({
            data: {
              slug: p.slug.trim(),
              nom: p.nom.trim(),
              typePoste: p.typePoste.trim(),
              lignes: JSON.stringify(p.lignes || []),
              adresse: p.adresse?.trim() || "",
              horaires: p.horaires?.trim() || "",
              electrification: p.electrification?.trim() || "",
              systemeBlock: p.systemeBlock?.trim() || "",
              annuaire: "[]",
              circuitsVoie: "[]",
              pnSensibles: "[]",
              particularites: JSON.stringify(p.particularites || []),
              proceduresCles: "[]",
              secteurId: secteurId ?? null,
            },
          });
          created++;
          details.push({ slug: p.slug, status: "created" });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ slug: p.slug || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des postes." }, { status: 500 });
  }
}
