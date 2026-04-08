import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

interface LettreAcronyme {
  lettre: string;
  signification: string;
  detail?: string;
}

export async function GET() {
  try {
    const [contacts, mnemoniques, abreviations, acces, postes, secteurs, procedures] =
      await Promise.all([
        prisma.contact.findMany({ orderBy: { nom: "asc" } }),
        prisma.mnemonique.findMany({ orderBy: { acronyme: "asc" } }),
        prisma.abreviation.findMany({ orderBy: { sigle: "asc" } }),
        prisma.accesRail.findMany({ orderBy: [{ ligne: "asc" }, { pk: "asc" }] }),
        prisma.poste.findMany({ orderBy: { nom: "asc" }, include: { secteurs: { include: { secteur: { select: { slug: true } } } } } }),
        prisma.secteur.findMany({ orderBy: { nom: "asc" } }),
        prisma.procedure.findMany({
          orderBy: { titre: "asc" },
          include: { postes: { include: { poste: { select: { slug: true } } } } },
        }),
      ]);

    const wb = XLSX.utils.book_new();

    // ─── Onglet AIDE ────────────────────────────────────────────────────────────
    const aideData = [
      ["MODE D'EMPLOI — IMPORT DE DONNÉES DE RÉFÉRENCE"],
      [""],
      ["Ce fichier contient les données actuelles de la base. Modifiez les lignes ou ajoutez-en de nouvelles,"],
      ["puis réimportez ce fichier dans le back-office via la page Import > Données de référence."],
      [""],
      ["═══ ONGLET CONTACTS (numéros utiles) ══════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Valeurs / Exemples"],
      ["nom", "Nom du contact", "OUI", "Jean Dupont, COGC Lyon"],
      ["role", "Rôle ou fonction", "OUI", "Chef de district, COGC"],
      ["categorie", "Catégorie", "OUI", "urgence | astreinte | encadrement | externe"],
      ["telephone", "Numéro principal", "OUI", "04 78 00 00 00"],
      ["telephoneAlt", "Numéro secondaire (optionnel)", "NON", "06 12 34 56 78"],
      ["note", "Note libre (optionnel)", "NON", "Disponible 24h/24"],
      ["disponibilite", "Horaires de disponibilité (optionnel)", "NON", "8h-18h en semaine"],
      [""],
      ["═══ ONGLET MNEMONIQUES ═════════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Valeurs / Exemples"],
      ["acronyme", "Sigle du mnémonique", "OUI", "CAMMI"],
      ["titre", "Titre complet", "OUI", "Comportement en cas d'accident"],
      ["description", "Description de l'usage", "OUI", "Aide-mémoire pour les agents de sécurité"],
      ["contexte", "Contexte d'utilisation (optionnel)", "NON", "Accident en gare"],
      ["couleur", "Couleur d'affichage (optionnel)", "NON", "blue | amber | red | green | purple"],
      [""],
      ["═══ ONGLET MNEMONIQUES_LETTRES ═════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["acronyme", "Doit correspondre à l'acronyme de l'onglet Mnemoniques", "OUI", "CAMMI"],
      ["ordre", "Ordre de la lettre dans l'acronyme (commence à 1)", "OUI", "1, 2, 3"],
      ["lettre", "La lettre", "OUI", "C"],
      ["signification", "Ce que représente la lettre", "OUI", "Calmer / sécuriser"],
      ["detail", "Détail ou sous-texte (optionnel)", "NON", "Rassurer les témoins"],
      [""],
      ["═══ ONGLET ABREVIATIONS ════════════════════════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["sigle", "Sigle ou abréviation (unique)", "OUI", "COGC, DSP, PN"],
      ["definition", "Définition complète", "OUI", "Centre Opérationnel de Gestion des Circulations"],
      [""],
      ["═══ ONGLET ACCES_RAIL (points d'accès ferroviaires) ═══════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["ligne", "Ligne ferroviaire", "OUI", "750000, 750100"],
      ["pk", "Point kilométrique", "OUI", "12+345"],
      ["type", "Type de point (optionnel)", "NON", "PN | TUN | PRO | SRD | PRA"],
      ["identifiant", "Identifiant spécifique (optionnel)", "NON", "178-2"],
      ["nomAffiche", "Nom affiché dans l'interface", "OUI", "PN 178-2"],
      ["nomComplet", "Nom brut complet (référence source)", "OUI", "750000-voie A 12+345 [PN [178-2]]"],
      ["latitude", "Latitude GPS (degrés décimaux)", "OUI", "45.7512"],
      ["longitude", "Longitude GPS (degrés décimaux)", "OUI", "4.8326"],
      ["description", "Description libre (optionnel)", "NON", "Passage à niveau gardé"],
      [""],
      ["═══ ONGLET POSTES (référentiels de postes) ═════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug", "Identifiant URL unique", "OUI", "givors-canal"],
      ["nom", "Nom du poste", "OUI", "Poste de Givors Canal"],
      ["typePoste", "Type de poste", "OUI", "PRG | PRS | PAI | PRCI"],
      ["lignes", "Lignes gérées, séparées par |", "OUI", "750000|750100"],
      ["adresse", "Adresse physique", "OUI", "Rue de la Gare, 69700 Givors"],
      ["horaires", "Horaires de service", "OUI", "24h/24"],
      ["electrification", "Système d'électrification", "OUI", "25 kV 50 Hz | Non électrifié"],
      ["systemeBlock", "Système de block", "OUI", "BEM | BAPR | BAL"],
      ["secteur_slug", "Slug(s) du/des secteur(s) associé(s), séparés par | (optionnel)", "NON", "givors-canal|peyraud"],
      ["particularites", "Particularités séparées par | (optionnel)", "NON", "Zone ATEX|Tunnel long"],
      ["annuaire_json", "JSON de l'annuaire (AnnuaireSection[]) — ne pas modifier à la main", "NON", "[{\"titre\":\"...\",\"contacts\":[...]}]"],
      ["circuitsVoie_json", "JSON des circuits voie (CircuitVoie[]) — ne pas modifier à la main", "NON", "[{\"voie\":\"V1\",\"longueur\":...}]"],
      ["pnSensibles_json", "JSON des PN sensibles (PNSensiblePoste[]) — ne pas modifier à la main", "NON", "[{\"pk\":\"...\",\"type\":\"...\"}]"],
      ["proceduresCles_json", "JSON des procédures clés (ProcedureCle[]) — ne pas modifier à la main", "NON", "[{\"titre\":\"...\",\"etapes\":[...]}]"],
      ["dbc_json", "JSON DBC (Dbc[]) — optionnel, ne pas modifier à la main", "NON", "[]"],
      ["rex_json", "JSON REX (string[]) — optionnel, ne pas modifier à la main", "NON", "[]"],
      [""],
      ["═══ ONGLET SECTEURS (secteurs ferroviaires) ════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug", "Identifiant URL unique (ne pas modifier)", "OUI", "givors-canal"],
      ["nom", "Nom du secteur", "OUI", "Secteur Givors Canal"],
      ["ligne", "Ligne(s) ferroviaire(s)", "OUI", "750000 / 750100"],
      ["trajet", "Description du trajet", "OUI", "Givors - Chasse-sur-Rhône"],
      ["description", "Description détaillée", "OUI", "Secteur couvrant la vallée du Gier"],
      ["pointsAcces_json", "JSON points d'accès (PointAcces[]) — ne pas modifier à la main", "NON", "[{\"nom\":\"...\",\"adresse\":\"...\",\"note\":\"...\"}]"],
      ["procedures_json", "JSON procédures spécifiques (données legacy) — ne pas modifier à la main", "NON", "[{\"titre\":\"...\",\"description\":\"...\"}]"],
      ["pn_json", "JSON passages à niveau (PassageNiveau[]) — ne pas modifier à la main", "NON", "[{\"numero\":\"PN 16\",\"axe\":\"...\"}]"],
      [""],
      ["═══ ONGLET PROCEDURES (procédures guidées) ═════════════════════════════════"],
      ["Colonne", "Description", "Obligatoire", "Exemples"],
      ["slug", "Identifiant URL unique", "OUI", "cessation-service-givors"],
      ["titre", "Titre de la procédure", "OUI", "Cessation de service — Givors Canal"],
      ["typeProcedure", "Type de procédure", "OUI", "cessation | reprise | incident | travaux | autre"],
      ["description", "Description courte (optionnel)", "NON", "Procédure standard de cessation de service"],
      ["version", "Numéro de version", "OUI", "1.0"],
      ["etapes_json", "JSON complet des étapes (ne pas modifier à la main)", "OUI", "[{\"id\":\"...\",\"titre\":\"...\"}]"],
      ["postes_slugs", "Slugs des postes associés, séparés par | (optionnel)", "NON", "givors-canal|saint-fons"],
      [""],
      ["IMPORTANT : Ne supprimez pas et ne renommez pas les onglets."],
      ["IMPORTANT : La ligne d'en-tête (première ligne) ne doit pas être modifiée."],
      ["IMPORTANT : Les colonnes *_json des postes (annuaire_json, circuitsVoie_json, etc.) sont exportées"],
      ["pour garantir un round-trip fidèle. Ne les modifiez pas manuellement — utilisez le back-office."],
      ["IMPORTANT : Les colonnes *_json des secteurs (pointsAcces_json, procedures_json, pn_json) sont"],
      ["exportées pour garantir un round-trip fidèle. Ne les modifiez pas manuellement."],
    ];
    const wsAide = XLSX.utils.aoa_to_sheet(aideData);
    wsAide["!cols"] = [{ wch: 22 }, { wch: 52 }, { wch: 14 }, { wch: 46 }];
    XLSX.utils.book_append_sheet(wb, wsAide, "Aide");

    // ─── Onglet CONTACTS ────────────────────────────────────────────────────────
    const contactsRows: unknown[][] = [
      ["nom", "role", "categorie", "telephone", "telephoneAlt", "note", "disponibilite"],
    ];
    for (const c of contacts) {
      contactsRows.push([
        c.nom,
        c.role,
        c.categorie,
        c.telephone,
        c.telephoneAlt || "",
        c.note || "",
        c.disponibilite || "",
      ]);
    }
    const wsContacts = XLSX.utils.aoa_to_sheet(contactsRows);
    wsContacts["!cols"] = [
      { wch: 30 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsContacts, "Contacts");

    // ─── Onglet MNEMONIQUES ─────────────────────────────────────────────────────
    const mnemoRows: unknown[][] = [
      ["acronyme", "titre", "description", "contexte", "couleur"],
    ];
    for (const m of mnemoniques) {
      mnemoRows.push([m.acronyme, m.titre, m.description, m.contexte || "", m.couleur || ""]);
    }
    const wsMnemo = XLSX.utils.aoa_to_sheet(mnemoRows);
    wsMnemo["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 55 }, { wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsMnemo, "Mnemoniques");

    // ─── Onglet MNEMONIQUES_LETTRES ─────────────────────────────────────────────
    const lettresRows: unknown[][] = [
      ["acronyme", "ordre", "lettre", "signification", "detail"],
    ];
    for (const m of mnemoniques) {
      let lettres: LettreAcronyme[] = [];
      try { lettres = JSON.parse(m.lettres) as LettreAcronyme[]; } catch { lettres = []; }
      lettres.forEach((l, idx) => {
        lettresRows.push([m.acronyme, idx + 1, l.lettre, l.signification, l.detail || ""]);
      });
    }
    const wsLettres = XLSX.utils.aoa_to_sheet(lettresRows);
    wsLettres["!cols"] = [{ wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 40 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsLettres, "Mnemoniques_Lettres");

    // ─── Onglet ABREVIATIONS ────────────────────────────────────────────────────
    const abrevRows: unknown[][] = [["sigle", "definition"]];
    for (const a of abreviations) {
      abrevRows.push([a.sigle, a.definition]);
    }
    const wsAbrev = XLSX.utils.aoa_to_sheet(abrevRows);
    wsAbrev["!cols"] = [{ wch: 16 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsAbrev, "Abreviations");

    // ─── Onglet ACCES_RAIL ──────────────────────────────────────────────────────
    const accesRows: unknown[][] = [
      ["ligne", "pk", "type", "identifiant", "nomAffiche", "nomComplet", "latitude", "longitude", "description"],
    ];
    for (const a of acces) {
      accesRows.push([
        a.ligne,
        a.pk,
        a.type || "",
        a.identifiant || "",
        a.nomAffiche,
        a.nomComplet,
        a.latitude,
        a.longitude,
        a.description || "",
      ]);
    }
    const wsAcces = XLSX.utils.aoa_to_sheet(accesRows);
    wsAcces["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAcces, "Acces_Rail");

    // ─── Onglet POSTES ──────────────────────────────────────────────────────────
    const postesRows: unknown[][] = [
      ["slug", "nom", "typePoste", "lignes", "adresse", "horaires", "electrification", "systemeBlock", "secteur_slug", "particularites", "annuaire_json", "circuitsVoie_json", "pnSensibles_json", "proceduresCles_json", "dbc_json", "rex_json"],
    ];
    for (const p of postes) {
      let lignes: string[] = [];
      try { lignes = JSON.parse(p.lignes) as string[]; } catch { lignes = []; }
      let particularites: string[] = [];
      try { particularites = JSON.parse(p.particularites) as string[]; } catch { particularites = []; }
      postesRows.push([
        p.slug,
        p.nom,
        p.typePoste,
        lignes.join("|"),
        p.adresse,
        p.horaires,
        p.electrification,
        p.systemeBlock,
        p.secteurs.map((ps) => ps.secteur.slug).join("|"),
        particularites.join("|"),
        p.annuaire,
        p.circuitsVoie,
        p.pnSensibles,
        p.proceduresCles,
        p.dbc || "[]",
        p.rex || "[]",
      ]);
    }
    const wsPostes = XLSX.utils.aoa_to_sheet(postesRows);
    wsPostes["!cols"] = [
      { wch: 22 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 35 }, { wch: 14 },
      { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 40 },
      { wch: 60 }, { wch: 60 }, { wch: 60 }, { wch: 60 }, { wch: 40 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPostes, "Postes");

    // ─── Onglet SECTEURS ────────────────────────────────────────────────────────
    const secteursRows: unknown[][] = [
      ["slug", "nom", "ligne", "trajet", "description", "pointsAcces_json", "procedures_json", "pn_json"],
    ];
    for (const s of secteurs) {
      secteursRows.push([s.slug, s.nom, s.ligne, s.trajet, s.description, s.pointsAcces, s.procedures, s.pn || "[]"]);
    }
    const wsSecteurs = XLSX.utils.aoa_to_sheet(secteursRows);
    wsSecteurs["!cols"] = [{ wch: 26 }, { wch: 32 }, { wch: 20 }, { wch: 35 }, { wch: 55 }, { wch: 60 }, { wch: 60 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSecteurs, "Secteurs");

    // ─── Onglet PROCEDURES ──────────────────────────────────────────────────────
    const proceduresRows: unknown[][] = [
      ["slug", "titre", "typeProcedure", "description", "version", "etapes_json", "postes_slugs"],
    ];
    for (const p of procedures) {
      const postesSlugs = p.postes.map((pp) => pp.poste.slug).join("|");
      proceduresRows.push([
        p.slug,
        p.titre,
        p.typeProcedure,
        p.description || "",
        p.version,
        p.etapes,
        postesSlugs,
      ]);
    }
    const wsProcedures = XLSX.utils.aoa_to_sheet(proceduresRows);
    wsProcedures["!cols"] = [
      { wch: 30 }, { wch: 40 }, { wch: 16 }, { wch: 40 }, { wch: 8 }, { wch: 80 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsProcedures, "Procedures");

    // ─── Générer le fichier ─────────────────────────────────────────────────────
    const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="donnees_reference_astreinte_${date}.xlsx"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération du fichier." }, { status: 500 });
  }
}
