import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // ─── Onglet AIDE ────────────────────────────────────────────────────────────
    const aideData = [
      ["MODE D'EMPLOI — IMPORT DE FICHES RÉFLEXES"],
      [""],
      ["Ce fichier vous permet de créer des fiches réflexes sans écrire de code."],
      ["Remplissez les onglets dans l'ordre, puis importez ce fichier dans le back-office."],
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
    ];
    const wsAide = XLSX.utils.aoa_to_sheet(aideData);
    wsAide["!cols"] = [{ wch: 24 }, { wch: 50 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsAide, "Aide");

    // ─── Onglet FICHES ──────────────────────────────────────────────────────────
    const fichesData = [
      ["numero", "slug", "titre", "categorie", "priorite", "mnemonique", "resume", "references", "avis_obligatoires"],
      [1, "accident-grave-gare", "Accident grave en gare", "accident", "urgente", "CAMMI", "Procédure à appliquer en cas d'accident grave en gare.", "OP522|RFN005", "COGC|DSP"],
      [2, "incident-signal", "Incident signal carré", "incident", "urgente", "", "Procédure en cas de signal carré franchit.", "", "COGC"],
    ];
    const wsFiches = XLSX.utils.aoa_to_sheet(fichesData);
    wsFiches["!cols"] = [
      { wch: 10 }, { wch: 28 }, { wch: 40 }, { wch: 18 }, { wch: 12 },
      { wch: 16 }, { wch: 50 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFiches, "Fiches");

    // ─── Onglet ETAPES ──────────────────────────────────────────────────────────
    const etapesData = [
      ["slug_fiche", "ordre", "titre", "description", "critique"],
      ["accident-grave-gare", 1, "Alerte et premiers secours", "Déclencher l'alarme et appeler les secours.", "oui"],
      ["accident-grave-gare", 2, "Sécurisation de la zone", "Baliser et sécuriser le périmètre autour de l'accident.", "non"],
      ["incident-signal", 1, "Arrêt du train", "S'assurer que le train est immobilisé.", "oui"],
      ["incident-signal", 2, "Contact avec le COGC", "Informer le régulateur de la situation.", "non"],
    ];
    const wsEtapes = XLSX.utils.aoa_to_sheet(etapesData);
    wsEtapes["!cols"] = [{ wch: 28 }, { wch: 8 }, { wch: 36 }, { wch: 50 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsEtapes, "Etapes");

    // ─── Onglet ACTIONS ─────────────────────────────────────────────────────────
    const actionsData = [
      ["slug_fiche", "ordre_etape", "ordre_action", "texte"],
      ["accident-grave-gare", 1, 1, "Appeler le 15 (SAMU)"],
      ["accident-grave-gare", 1, 2, "Appeler le 18 (Pompiers)"],
      ["accident-grave-gare", 1, 3, "Prévenir le chef de gare"],
      ["accident-grave-gare", 2, 1, "Mettre en place le balisage réglementaire"],
      ["accident-grave-gare", 2, 2, "Interdire l'accès au quai concerné"],
      ["incident-signal", 1, 1, "Vérifier la position du signal sur le TCO"],
      ["incident-signal", 2, 1, "Appeler le COGC au numéro d'astreinte"],
    ];
    const wsActions = XLSX.utils.aoa_to_sheet(actionsData);
    wsActions["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsActions, "Actions");

    // ─── Onglet CONTACTS_LIES ───────────────────────────────────────────────────
    const contactsData = [
      ["slug_fiche", "nom_contact"],
      ["accident-grave-gare", "Exemples : indiquez le nom exact du contact tel qu'il apparaît dans la base"],
    ];
    const wsContacts = XLSX.utils.aoa_to_sheet(contactsData);
    wsContacts["!cols"] = [{ wch: 28 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsContacts, "Contacts_lies");

    // ─── Onglet SECTEURS_LIES ───────────────────────────────────────────────────
    const secteursData = [
      ["slug_fiche", "nom_secteur"],
      ["accident-grave-gare", "Exemples : indiquez le nom exact du secteur tel qu'il apparaît dans la base"],
    ];
    const wsSecteurs = XLSX.utils.aoa_to_sheet(secteursData);
    wsSecteurs["!cols"] = [{ wch: 28 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSecteurs, "Secteurs_lies");

    // Générer le fichier
    const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modele_fiches_astreinte.xlsx"',
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération du modèle." }, { status: 500 });
  }
}
