import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ProcedureInput {
  slug: string;
  titre: string;
  typeProcedure: string;
  description?: string;
  version: string;
  etapes_json: string;
  postes_slugs?: string;
}

const VALID_TYPES = ["cessation", "reprise", "incident", "travaux", "autre"];
const VALID_ACTION_TYPES = ["information", "question_oui_non", "question_choix", "saisie_texte", "confirmation"];
const VALID_NIVEAUX = ["informatif", "alerte", "bloquant"];

function validateEtapesStructure(etapes: unknown[]): string[] {
  const errors: string[] = [];
  etapes.forEach((etape, ei) => {
    const e = etape as Record<string, unknown>;
    const prefix = `Étape ${ei + 1}`;
    if (!e.id || typeof e.id !== "string") errors.push(`${prefix} : champ "id" manquant ou invalide`);
    if (!e.titre || typeof e.titre !== "string") errors.push(`${prefix} : champ "titre" manquant`);
    if (typeof e.ordre !== "number") errors.push(`${prefix} : champ "ordre" manquant ou non numérique`);
    if (!Array.isArray(e.actions)) {
      errors.push(`${prefix} : champ "actions" manquant ou non-tableau`);
      return;
    }
    (e.actions as unknown[]).forEach((action, ai) => {
      const a = action as Record<string, unknown>;
      const aPrefix = `${prefix} action ${ai + 1}`;
      if (!a.id || typeof a.id !== "string") errors.push(`${aPrefix} : "id" manquant`);
      if (!a.label || typeof a.label !== "string") errors.push(`${aPrefix} : "label" manquant`);
      if (!VALID_ACTION_TYPES.includes(a.type as string)) errors.push(`${aPrefix} : type "${a.type}" invalide`);
      if (typeof a.obligatoire !== "boolean") errors.push(`${aPrefix} : "obligatoire" doit être un booléen`);
      if (typeof a.verifiable !== "boolean") errors.push(`${aPrefix} : "verifiable" doit être un booléen`);
      if (!VALID_NIVEAUX.includes(a.niveau as string)) errors.push(`${aPrefix} : niveau "${a.niveau}" invalide`);
    });
  });
  return errors;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedures, mode = "upsert" }: { procedures: ProcedureInput[]; mode: string } = body;

    if (!Array.isArray(procedures)) {
      return NextResponse.json({ error: "Champ 'procedures' manquant ou invalide." }, { status: 400 });
    }

    // Précharger tous les postes (slug → id)
    const allPostes = await prisma.poste.findMany({ select: { id: true, slug: true } });
    const posteBySlug = new Map(allPostes.map((p) => [p.slug, p.id]));

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { status: string; reason?: string }[] = [];

    for (const p of procedures) {
      try {
        // Validation
        if (!p.slug) { rejected++; details.push({ status: "rejected", reason: `Slug manquant` }); continue; }
        if (!p.titre) { rejected++; details.push({ status: "rejected", reason: `${p.slug} : titre manquant` }); continue; }
        if (!VALID_TYPES.includes(p.typeProcedure)) { rejected++; details.push({ status: "rejected", reason: `${p.slug} : typeProcedure invalide "${p.typeProcedure}"` }); continue; }
        if (!p.etapes_json) { rejected++; details.push({ status: "rejected", reason: `${p.slug} : etapes_json manquant` }); continue; }

        // Valider le JSON des étapes — syntaxe + structure
        let etapesJson: string;
        try {
          const parsed = JSON.parse(p.etapes_json);
          if (!Array.isArray(parsed)) throw new Error("Pas un tableau");
          const structErrors = validateEtapesStructure(parsed);
          if (structErrors.length > 0) {
            rejected++;
            details.push({ status: "rejected", reason: `${p.slug} : structure etapes_json invalide — ${structErrors.slice(0, 3).join("; ")}${structErrors.length > 3 ? ` (+ ${structErrors.length - 3} autres)` : ""}` });
            continue;
          }
          etapesJson = JSON.stringify(parsed);
        } catch (e) {
          rejected++;
          details.push({ status: "rejected", reason: `${p.slug} : etapes_json invalide — ${e instanceof Error ? e.message : "JSON malformé"}` });
          continue;
        }

        // Résoudre les postes associés
        const postesSlugs = p.postes_slugs
          ? p.postes_slugs.split("|").map((s) => s.trim()).filter(Boolean)
          : [];
        const posteIds = postesSlugs
          .map((s) => posteBySlug.get(s))
          .filter((id): id is string => !!id);
        const missingPostes = postesSlugs.filter((s) => !posteBySlug.has(s));

        const existing = await prisma.procedure.findUnique({ where: { slug: p.slug } });

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ status: "rejected", reason: `${p.slug} : déjà existant (mode créer uniquement)` });
            continue;
          }
          // Mettre à jour
          await prisma.procedure.update({
            where: { slug: p.slug },
            data: {
              titre: p.titre,
              typeProcedure: p.typeProcedure,
              description: p.description || null,
              version: p.version || "1.0",
              etapes: etapesJson,
            },
          });
          // Resynchroniser les postes associés
          await prisma.posteProcedure.deleteMany({ where: { procedureId: existing.id } });
          if (posteIds.length > 0) {
            await prisma.posteProcedure.createMany({
              data: posteIds.map((posteId, idx) => ({ posteId, procedureId: existing.id, ordre: idx })),
            });
          }
          updated++;
          const warn = missingPostes.length > 0 ? ` (postes introuvables ignorés : ${missingPostes.join(", ")})` : "";
          details.push({ status: "updated", reason: `${p.slug}${warn}` });
        } else {
          // Créer
          const created_ = await prisma.procedure.create({
            data: {
              slug: p.slug,
              titre: p.titre,
              typeProcedure: p.typeProcedure,
              description: p.description || null,
              version: p.version || "1.0",
              etapes: etapesJson,
            },
          });
          if (posteIds.length > 0) {
            await prisma.posteProcedure.createMany({
              data: posteIds.map((posteId, idx) => ({ posteId, procedureId: created_.id, ordre: idx })),
            });
          }
          created++;
          const warn = missingPostes.length > 0 ? ` (postes introuvables ignorés : ${missingPostes.join(", ")})` : "";
          details.push({ status: "created", reason: `${p.slug}${warn}` });
        }
      } catch (e) {
        rejected++;
        details.push({ status: "rejected", reason: `${p.slug || "?"} : erreur interne — ${e instanceof Error ? e.message : "inconnu"}` });
      }
    }

    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'import des procédures." }, { status: 500 });
  }
}
