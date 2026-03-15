import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

interface Etape {
  ordre: number;
  titre: string;
  description: string;
  critique?: boolean;
  actions?: string[];
}

export async function GET() {
  try {
    // ─── Récupérer toutes les fiches avec leurs relations ──────────────────────
    const fiches = await prisma.fiche.findMany({
      orderBy: { numero: "asc" },
      include: {
        contacts: { include: { contact: { select: { nom: true } } } },
        secteurs: { include: { secteur: { select: { nom: true } } } },
      },
    });

    const wb = XLSX.utils.book_new();

    // ─── Onglet AIDE ────────────────────────────────────────────────────────────
    const aideData = [
      ["MODE D'EMPLOI — IMPORT DE FICHES RÉFLEXES"],
      [""],
      ["Ce fichier contient les données actuelles de la base. Vous pouvez modifier les lignes existantes"],
      ["ou en ajouter de nouvelles, puis réimporter ce fichier dans le back-office."],
      [""],
      ["═══ ONGLET FICHES ══════════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Valeurs autorisées / Exemples"],
      ["numero", "Numéro unique de la fiche", "OUI", "1, 2, 3 … (entier)"],
      ["slug", "Identifiant URL (sans espaces, minuscules, tirets)", "OUI", "accident-grave, incident-signal"],
      ["titre", "Titre de la fiche", "OUI", "Accident grave en gare"],
      ["categorie", "Catégorie de la fiche", "OUI", "accident | incident | securite | gestion-agent | evacuation"],
      ["priorite", "Niveau de priorité", "OUI", "urgente | normale"],
      ["mnemonique", "Mnémonique associé (optionnel)", "NON", "CAMMI, CoCo RR"],
      ["resume", "Résumé bref de la procédure", "OUI", "Appliquer la procédure d'urgence..."],
      ["references", "Références réglementaires, séparées par |", "NON", "OP522|RFN005|IG0001"],
      ["avis_obligatoires", "Avis obligatoires à notifier, séparés par |", "NON", "COGC|DSP|Préfet"],
      [""],
      ["═══ ONGLET ETAPES ══════════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug_fiche", "Slug de la fiche parente (doit exister dans l'onglet Fiches)", "OUI", "accident-grave"],
      ["ordre", "Numéro d'ordre de l'étape (commence à 1)", "OUI", "1, 2, 3"],
      ["titre", "Titre de l'étape", "OUI", "Alerte et premiers secours"],
      ["description", "Description détaillée de l'étape", "OUI", "Déclencher l'alerte immédiate..."],
      ["critique", "Étape critique (bloque la suite ?)", "NON", "oui | non (défaut : non)"],
      [""],
      ["═══ ONGLET ACTIONS ═════════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug_fiche", "Slug de la fiche parente", "OUI", "accident-grave"],
      ["ordre_etape", "Numéro de l'étape parente", "OUI", "1"],
      ["ordre_action", "Numéro d'ordre de l'action dans l'étape", "OUI", "1, 2, 3"],
      ["texte", "Texte de l'action à effectuer", "OUI", "Appeler le 15 (SAMU)"],
      [""],
      ["═══ ONGLET CONTACTS_LIES ════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug_fiche", "Slug de la fiche", "OUI", "accident-grave"],
      ["nom_contact", "Nom du contact (doit exister dans la base)", "OUI", "Jean Dupont"],
      [""],
      ["═══ ONGLET SECTEURS_LIES ════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug_fiche", "Slug de la fiche", "OUI", "accident-grave"],
      ["nom_secteur", "Nom du secteur (doit exister dans la base)", "OUI", "Givors Canal"],
      [""],
      ["IMPORTANT : Ne supprimez pas et ne renommez pas les onglets."],
      ["IMPORTANT : La ligne d'en-tête (première ligne) ne doit pas être modifiée."],
      ["IMPORTANT : En mode 'Créer + mettre à jour', les fiches existantes (même slug/numéro) seront mises à jour."],
    ];
    const wsAide = XLSX.utils.aoa_to_sheet(aideData);
    wsAide["!cols"] = [{ wch: 24 }, { wch: 55 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsAide, "Aide");

    // ─── Onglet FICHES ──────────────────────────────────────────────────────────
    const fichesRows: unknown[][] = [
      ["numero", "slug", "titre", "categorie", "priorite", "mnemonique", "resume", "references", "avis_obligatoires"],
    ];
    for (const f of fiches) {
      const refs = f.references ? (JSON.parse(f.references) as string[]).join("|") : "";
      const avis = f.avisObligatoires ? (JSON.parse(f.avisObligatoires) as string[]).join("|") : "";
      fichesRows.push([
        f.numero,
        f.slug,
        f.titre,
        f.categorie,
        f.priorite,
        f.mnemonique || "",
        f.resume,
        refs,
        avis,
      ]);
    }
    const wsFiches = XLSX.utils.aoa_to_sheet(fichesRows);
    wsFiches["!cols"] = [
      { wch: 10 }, { wch: 30 }, { wch: 45 }, { wch: 18 }, { wch: 12 },
      { wch: 16 }, { wch: 55 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFiches, "Fiches");

    // ─── Onglet ETAPES ──────────────────────────────────────────────────────────
    const etapesRows: unknown[][] = [
      ["slug_fiche", "ordre", "titre", "description", "critique"],
    ];
    for (const f of fiches) {
      let etapes: Etape[] = [];
      try { etapes = JSON.parse(f.etapes) as Etape[]; } catch { etapes = []; }
      for (const e of etapes) {
        etapesRows.push([
          f.slug,
          e.ordre,
          e.titre,
          e.description,
          e.critique ? "oui" : "non",
        ]);
      }
    }
    const wsEtapes = XLSX.utils.aoa_to_sheet(etapesRows);
    wsEtapes["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 40 }, { wch: 55 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsEtapes, "Etapes");

    // ─── Onglet ACTIONS ─────────────────────────────────────────────────────────
    const actionsRows: unknown[][] = [
      ["slug_fiche", "ordre_etape", "ordre_action", "texte"],
    ];
    for (const f of fiches) {
      let etapes: Etape[] = [];
      try { etapes = JSON.parse(f.etapes) as Etape[]; } catch { etapes = []; }
      for (const e of etapes) {
        const actions = e.actions || [];
        actions.forEach((texte, idx) => {
          actionsRows.push([f.slug, e.ordre, idx + 1, texte]);
        });
      }
    }
    const wsActions = XLSX.utils.aoa_to_sheet(actionsRows);
    wsActions["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsActions, "Actions");

    // ─── Onglet CONTACTS_LIES ───────────────────────────────────────────────────
    const contactsRows: unknown[][] = [["slug_fiche", "nom_contact"]];
    for (const f of fiches) {
      for (const fc of f.contacts) {
        contactsRows.push([f.slug, fc.contact.nom]);
      }
    }
    const wsContacts = XLSX.utils.aoa_to_sheet(contactsRows);
    wsContacts["!cols"] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsContacts, "Contacts_lies");

    // ─── Onglet SECTEURS_LIES ───────────────────────────────────────────────────
    const secteursRows: unknown[][] = [["slug_fiche", "nom_secteur"]];
    for (const f of fiches) {
      for (const fs of f.secteurs) {
        secteursRows.push([f.slug, fs.secteur.nom]);
      }
    }
    const wsSecteurs = XLSX.utils.aoa_to_sheet(secteursRows);
    wsSecteurs["!cols"] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSecteurs, "Secteurs_lies");

    // ─── Générer le fichier ─────────────────────────────────────────────────────
    const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="fiches_astreinte_${date}.xlsx"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération du fichier." }, { status: 500 });
  }
}
