import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  annuaire_json?: string;
  circuitsVoie_json?: string;
  pnSensibles_json?: string;
  proceduresCles_json?: string;
  dbc_json?: string;
  rex_json?: string;
}

function parseJsonField(raw: string | undefined, fallback: string): { value: string; error?: string } {
  if (!raw?.trim()) return { value: fallback };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { value: fallback, error: `Doit être un tableau JSON` };
    return { value: raw.trim() };
  } catch {
    return { value: fallback, error: `JSON malformé` };
  }
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

        // secteur_slug peut contenir plusieurs slugs séparés par "|" (ex: "givors-canal|peyraud")
        const secteurSlugs = p.secteur_slug?.trim()
          ? p.secteur_slug.trim().split("|").map((s) => s.trim()).filter(Boolean)
          : [];

        const resolvedSecteurIds: string[] = [];
        let secteurError: string | null = null;
        for (const slug of secteurSlugs) {
          const id = secteurMap.get(slug);
          if (!id) { secteurError = `Secteur introuvable : "${slug}"`; break; }
          resolvedSecteurIds.push(id);
        }

        if (secteurError) {
          rejected++;
          details.push({ slug: p.slug, status: "rejected", reason: secteurError });
          continue;
        }

        const existing = await prisma.poste.findUnique({ where: { slug: p.slug.trim() } });

        // Valider les champs JSON optionnels
        const jsonWarnings: string[] = [];
        const annuaire = parseJsonField(p.annuaire_json, existing?.annuaire ?? "[]");
        const circuitsVoie = parseJsonField(p.circuitsVoie_json, existing?.circuitsVoie ?? "[]");
        const pnSensibles = parseJsonField(p.pnSensibles_json, existing?.pnSensibles ?? "[]");
        const proceduresCles = parseJsonField(p.proceduresCles_json, existing?.proceduresCles ?? "[]");
        const dbc = parseJsonField(p.dbc_json, existing?.dbc ?? "[]");
        const rex = parseJsonField(p.rex_json, existing?.rex ?? "[]");
        for (const [field, result] of [["annuaire_json", annuaire], ["circuitsVoie_json", circuitsVoie], ["pnSensibles_json", pnSensibles], ["proceduresCles_json", proceduresCles], ["dbc_json", dbc], ["rex_json", rex]] as [string, ReturnType<typeof parseJsonField>][]) {
          if (result.error) jsonWarnings.push(`${field}: ${result.error} (valeur ignorée)`);
        }

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
              annuaire: annuaire.value,
              circuitsVoie: circuitsVoie.value,
              pnSensibles: pnSensibles.value,
              proceduresCles: proceduresCles.value,
              dbc: dbc.value,
              rex: rex.value,
              secteurs: secteurSlugs.length > 0
                ? { deleteMany: {}, create: resolvedSecteurIds.map((secteurId) => ({ secteurId })) }
                : { deleteMany: {} },
            },
          });
          updated++;
          details.push({ slug: p.slug, status: "updated", ...(jsonWarnings.length ? { reason: jsonWarnings.join("; ") } : {}) });
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
              annuaire: annuaire.value,
              circuitsVoie: circuitsVoie.value,
              pnSensibles: pnSensibles.value,
              particularites: JSON.stringify(p.particularites || []),
              proceduresCles: proceduresCles.value,
              dbc: dbc.value || undefined,
              rex: rex.value || undefined,
              secteurs: resolvedSecteurIds.length > 0
                ? { create: resolvedSecteurIds.map((secteurId) => ({ secteurId })) }
                : undefined,
            },
          });
          created++;
          details.push({ slug: p.slug, status: "created", ...(jsonWarnings.length ? { reason: jsonWarnings.join("; ") } : {}) });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ slug: p.slug || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");
    revalidatePath("/recherche");
    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des postes." }, { status: 500 });
  }
}
