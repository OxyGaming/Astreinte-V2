import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface EtapeData {
  ordre: number;
  titre: string;
  description: string;
  critique: boolean;
  actions: string[];
}

interface FicheData {
  slug: string;
  numero: number;
  titre: string;
  categorie: string;
  priorite: string;
  mnemonique: string;
  resume: string;
  references: string[];
  avisObligatoires: string[];
  etapes: EtapeData[];
  contactIds: string[];
  secteurIds: string[];
}

type ImportMode = "create" | "upsert";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fiches: FicheData[] = body.fiches;
    const mode: ImportMode = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(fiches) || fiches.length === 0) {
      return NextResponse.json({ error: "Aucune fiche à importer." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { slug: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const f of fiches) {
      try {
        // Validation minimale
        if (!f.slug || !f.titre || !f.resume || !f.numero) {
          rejected++;
          details.push({ slug: f.slug || "?", status: "rejected", reason: "Champs obligatoires manquants" });
          continue;
        }

        const etapesJson = JSON.stringify(
          f.etapes.map((e) => ({
            ordre: e.ordre,
            titre: e.titre,
            description: e.description,
            critique: e.critique,
            actions: e.actions,
          }))
        );
        const referencesJson = JSON.stringify(f.references || []);
        const avisJson = JSON.stringify(f.avisObligatoires || []);

        const existing = await prisma.fiche.findFirst({
          where: { OR: [{ slug: f.slug }, { numero: f.numero }] },
        });

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ slug: f.slug, status: "rejected", reason: "Fiche déjà existante (slug ou numéro)" });
            continue;
          }

          // Mettre à jour
          await prisma.fiche.update({
            where: { id: existing.id },
            data: {
              slug: f.slug,
              numero: f.numero,
              titre: f.titre,
              categorie: f.categorie,
              priorite: f.priorite,
              mnemonique: f.mnemonique || null,
              resume: f.resume,
              etapes: etapesJson,
              references: referencesJson,
              avisObligatoires: avisJson,
              contacts: {
                deleteMany: {},
                create: f.contactIds.map((contactId) => ({ contactId })),
              },
              secteurs: {
                deleteMany: {},
                create: f.secteurIds.map((secteurId) => ({ secteurId })),
              },
            },
          });
          updated++;
          details.push({ slug: f.slug, status: "updated" });
        } else {
          // Créer
          await prisma.fiche.create({
            data: {
              slug: f.slug,
              numero: f.numero,
              titre: f.titre,
              categorie: f.categorie,
              priorite: f.priorite,
              mnemonique: f.mnemonique || null,
              resume: f.resume,
              etapes: etapesJson,
              references: referencesJson,
              avisObligatoires: avisJson,
              contacts: {
                create: f.contactIds.map((contactId) => ({ contactId })),
              },
              secteurs: {
                create: f.secteurIds.map((secteurId) => ({ secteurId })),
              },
            },
          });
          created++;
          details.push({ slug: f.slug, status: "created" });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({
          slug: f.slug || "?",
          status: "rejected",
          reason: e instanceof Error ? e.message : "Erreur inconnue",
        });
      }
    }

    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des fiches." }, { status: 500 });
  }
}
