import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLiensImportField, normalizeLiensPayloadSync } from "@/lib/liens-server";
import type { LienRef } from "@/lib/types";

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
  mnemonique?: string;
  resume: string;
  /** UI/import direct : tableaux déjà structurés. */
  references?: string[];
  avisObligatoires?: string[];
  etapes?: EtapeData[];
  contactIds?: string[];
  secteurIds?: string[];
  /** Excel global : chaînes JSON déjà sérialisées. */
  etapes_json?: string;
  references_json?: string;
  avisObligatoires_json?: string;
  /** Excel global : libellés/slug séparés par "|" — résolus côté serveur. */
  contact_noms?: string;
  secteur_slugs?: string;
  /** Liens utiles déjà sérialisés (chaîne JSON) — flux Excel/import groupé. */
  liens_json?: string;
  /** Liens utiles structurés — flux UI/import direct. */
  liens?: LienRef[];
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

    const knownLiens = await prisma.lien.findMany({ select: { id: true } });
    const knownLienIds = new Set(knownLiens.map((l) => l.id));

    // Précharger contacts par nom et secteurs par slug — pour résoudre les
    // payloads Excel qui n'embarquent pas les IDs internes.
    const allContacts = await prisma.contact.findMany({ select: { id: true, nom: true } });
    const contactByNom = new Map(allContacts.map((c) => [c.nom.toLowerCase(), c.id]));
    const allSecteurs = await prisma.secteur.findMany({ select: { id: true, slug: true } });
    const secteurBySlug = new Map(allSecteurs.map((s) => [s.slug, s.id]));

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

        // Étapes : structurées (UI) ou pré-sérialisées (Excel global)
        let etapesJson: string;
        if (Array.isArray(f.etapes)) {
          etapesJson = JSON.stringify(
            f.etapes.map((e) => ({
              ordre: e.ordre,
              titre: e.titre,
              description: e.description,
              critique: e.critique,
              actions: e.actions,
            })),
          );
        } else if (typeof f.etapes_json === "string" && f.etapes_json.trim()) {
          // Pass-through avec vérification syntaxique
          try {
            const parsed = JSON.parse(f.etapes_json);
            if (!Array.isArray(parsed)) throw new Error("etapes_json doit être un tableau");
            etapesJson = JSON.stringify(parsed);
          } catch (e) {
            rejected++;
            details.push({ slug: f.slug, status: "rejected", reason: `etapes_json invalide — ${e instanceof Error ? e.message : "JSON malformé"}` });
            continue;
          }
        } else {
          rejected++;
          details.push({ slug: f.slug, status: "rejected", reason: "Étapes manquantes (etapes ou etapes_json requis)" });
          continue;
        }
        const referencesJson = f.references_json?.trim()
          ? f.references_json
          : JSON.stringify(f.references || []);
        const avisJson = f.avisObligatoires_json?.trim()
          ? f.avisObligatoires_json
          : JSON.stringify(f.avisObligatoires || []);

        // Résolution contacts/secteurs : préférer les IDs s'ils sont fournis,
        // sinon résoudre depuis les libellés/slug du flux Excel.
        let contactIds: string[];
        if (Array.isArray(f.contactIds)) {
          contactIds = f.contactIds;
        } else if (f.contact_noms?.trim()) {
          const noms = f.contact_noms.split("|").map((s) => s.trim()).filter(Boolean);
          contactIds = [];
          const missing: string[] = [];
          for (const nom of noms) {
            const id = contactByNom.get(nom.toLowerCase());
            if (id) contactIds.push(id); else missing.push(nom);
          }
          if (missing.length) {
            // Soft warning : on ne bloque pas la fiche, on perd juste les liens manquants
            details.push({ slug: f.slug, status: "rejected", reason: `Contacts introuvables : ${missing.join(", ")}` });
            rejected++;
            continue;
          }
        } else {
          contactIds = [];
        }
        let secteurIds: string[];
        if (Array.isArray(f.secteurIds)) {
          secteurIds = f.secteurIds;
        } else if (f.secteur_slugs?.trim()) {
          const slugs = f.secteur_slugs.split("|").map((s) => s.trim()).filter(Boolean);
          secteurIds = [];
          const missing: string[] = [];
          for (const slug of slugs) {
            const id = secteurBySlug.get(slug);
            if (id) secteurIds.push(id); else missing.push(slug);
          }
          if (missing.length) {
            details.push({ slug: f.slug, status: "rejected", reason: `Secteurs introuvables : ${missing.join(", ")}` });
            rejected++;
            continue;
          }
        } else {
          secteurIds = [];
        }

        const existing = await prisma.fiche.findFirst({
          where: { OR: [{ slug: f.slug }, { numero: f.numero }] },
        });

        // Liens : deux entrées possibles — `liens` (LienRef[]) ou `liens_json` (string)
        // Si rien n'est fourni : conserver la valeur existante en base.
        let liensValue: string | null | undefined;
        let liensWarning: string | null = null;
        if (Array.isArray(f.liens)) {
          const result = normalizeLiensPayloadSync(f.liens, knownLienIds);
          if (!result.ok) {
            rejected++;
            details.push({ slug: f.slug, status: "rejected", reason: `liens : ${result.error}` });
            continue;
          }
          liensValue = result.json;
        } else {
          const parsed = parseLiensImportField(f.liens_json, knownLienIds);
          if (parsed.error) {
            liensWarning = `liens_json: ${parsed.error} (valeur ignorée)`;
            liensValue = existing?.liens ?? null;
          } else {
            liensValue = parsed.value ?? existing?.liens ?? null;
          }
        }

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
              liens: liensValue,
              contacts: {
                deleteMany: {},
                create: contactIds.map((contactId) => ({ contactId })),
              },
              secteurs: {
                deleteMany: {},
                create: secteurIds.map((secteurId) => ({ secteurId })),
              },
            },
          });
          updated++;
          details.push({ slug: f.slug, status: "updated", ...(liensWarning ? { reason: liensWarning } : {}) });
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
              liens: liensValue ?? undefined,
              contacts: {
                create: contactIds.map((contactId) => ({ contactId })),
              },
              secteurs: {
                create: secteurIds.map((secteurId) => ({ secteurId })),
              },
            },
          });
          created++;
          details.push({ slug: f.slug, status: "created", ...(liensWarning ? { reason: liensWarning } : {}) });
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
