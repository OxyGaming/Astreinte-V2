import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

interface SecteurData {
  slug: string;
  nom: string;
  ligne: string;
  trajet: string;
  description: string;
  pointsAcces_json?: string;
  procedures_json?: string;
  pn_json?: string;
}

function parseJsonField(raw: string | undefined, fallback: string): { value: string; error?: string } {
  if (!raw?.trim()) return { value: fallback };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { value: fallback, error: "Doit être un tableau JSON" };
    return { value: raw.trim() };
  } catch {
    return { value: fallback, error: "JSON malformé" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secteurs: SecteurData[] = body.secteurs;
    const mode: "create" | "upsert" = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(secteurs) || secteurs.length === 0) {
      return NextResponse.json({ error: "Aucun secteur à importer." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { slug: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const s of secteurs) {
      try {
        if (!s.slug?.trim() || !s.nom?.trim()) {
          rejected++;
          details.push({ slug: s.slug || "?", status: "rejected", reason: "Champs obligatoires manquants (slug, nom)" });
          continue;
        }

        const existing = await prisma.secteur.findUnique({ where: { slug: s.slug.trim() } });

        // Valider les champs JSON optionnels
        const jsonWarnings: string[] = [];
        const pointsAcces = parseJsonField(s.pointsAcces_json, existing?.pointsAcces ?? "[]");
        const procedures = parseJsonField(s.procedures_json, existing?.procedures ?? "[]");
        const pn = parseJsonField(s.pn_json, existing?.pn ?? "[]");
        for (const [field, result] of [["pointsAcces_json", pointsAcces], ["procedures_json", procedures], ["pn_json", pn]] as [string, ReturnType<typeof parseJsonField>][]) {
          if (result.error) jsonWarnings.push(`${field}: ${result.error} (valeur ignorée)`);
        }

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ slug: s.slug, status: "rejected", reason: "Secteur déjà existant (même slug)" });
            continue;
          }
          await prisma.secteur.update({
            where: { id: existing.id },
            data: {
              nom: s.nom.trim(),
              ligne: s.ligne?.trim() || existing.ligne,
              trajet: s.trajet?.trim() || existing.trajet,
              description: s.description?.trim() || existing.description,
              pointsAcces: pointsAcces.value,
              procedures: procedures.value,
              pn: pn.value,
            },
          });
          updated++;
          details.push({ slug: s.slug, status: "updated", ...(jsonWarnings.length ? { reason: jsonWarnings.join("; ") } : {}) });
        } else {
          if (!s.ligne?.trim() || !s.trajet?.trim() || !s.description?.trim()) {
            rejected++;
            details.push({ slug: s.slug, status: "rejected", reason: "Champs obligatoires manquants pour la création (ligne, trajet, description)" });
            continue;
          }
          await prisma.secteur.create({
            data: {
              slug: s.slug.trim(),
              nom: s.nom.trim(),
              ligne: s.ligne.trim(),
              trajet: s.trajet.trim(),
              description: s.description.trim(),
              pointsAcces: pointsAcces.value,
              procedures: procedures.value,
              pn: pn.value || undefined,
            },
          });
          created++;
          details.push({ slug: s.slug, status: "created", ...(jsonWarnings.length ? { reason: jsonWarnings.join("; ") } : {}) });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ slug: s.slug || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    revalidatePath("/secteurs");
    revalidatePath("/secteurs/[slug]", "page");
    revalidatePath("/");
    revalidatePath("/recherche");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des secteurs." }, { status: 500 });
  }
}
