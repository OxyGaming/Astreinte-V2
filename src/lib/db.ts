/**
 * Couche d'accès aux données — source unique de vérité (DB Prisma/SQLite)
 * Remplace les imports directs depuis src/data/*.ts dans le front-office.
 */
import { prisma } from "./prisma";
import type { Fiche, Contact, Secteur, Mnemonique, Abréviation, Etape, PointAcces, Procedure, PassageNiveau, LettreAcronyme, AccesRail } from "./types";

// ─── Helpers de désérialisation JSON ─────────────────────────────────────────

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getAllContacts(): Promise<Contact[]> {
  const rows = await prisma.contact.findMany({ orderBy: [{ categorie: "asc" }, { nom: "asc" }] });
  return rows.map(dbToContact);
}

export async function getContactById(id: string): Promise<Contact | null> {
  const row = await prisma.contact.findUnique({ where: { id } });
  return row ? dbToContact(row) : null;
}

function dbToContact(row: {
  id: string; nom: string; role: string; categorie: string;
  telephone: string; telephoneAlt: string | null; note: string | null; disponibilite: string | null;
}): Contact {
  return {
    id: row.id, nom: row.nom, role: row.role,
    categorie: row.categorie as Contact["categorie"],
    telephone: row.telephone,
    telephone_alt: row.telephoneAlt ?? undefined,
    note: row.note ?? undefined,
    disponibilite: row.disponibilite ?? undefined,
  };
}

// ─── Secteurs ─────────────────────────────────────────────────────────────────

export async function getAllSecteurs(): Promise<Secteur[]> {
  const rows = await prisma.secteur.findMany({ orderBy: { nom: "asc" } });
  return rows.map(dbToSecteur);
}

export async function getSecteurBySlug(slug: string): Promise<Secteur | null> {
  const row = await prisma.secteur.findUnique({ where: { slug } });
  return row ? dbToSecteur(row) : null;
}

function dbToSecteur(row: {
  id: string; slug: string; nom: string; ligne: string; trajet: string; description: string;
  pointsAcces: string; procedures: string; pn: string | null;
}): Secteur {
  return {
    id: row.id, slug: row.slug, nom: row.nom, ligne: row.ligne, trajet: row.trajet, description: row.description,
    points_acces: parseJson<PointAcces[]>(row.pointsAcces, []),
    procedures: parseJson<Procedure[]>(row.procedures, []),
    pn: parseJson<PassageNiveau[]>(row.pn, []),
  };
}

// ─── Fiches ────────────────────────────────────────────────────────────────────

export async function getAllFiches(): Promise<Fiche[]> {
  const rows = await prisma.fiche.findMany({
    orderBy: { numero: "asc" },
    include: { contacts: { select: { contactId: true } } },
  });
  return rows.map(dbToFiche);
}

export async function getFicheBySlug(slug: string): Promise<Fiche | null> {
  const row = await prisma.fiche.findUnique({
    where: { slug },
    include: { contacts: { select: { contactId: true } } },
  });
  return row ? dbToFiche(row) : null;
}

function dbToFiche(row: {
  id: string; slug: string; numero: number; titre: string; categorie: string; priorite: string;
  mnemonique: string | null; resume: string; etapes: string; references: string | null;
  avisObligatoires: string | null; contacts: { contactId: string }[];
}): Fiche {
  return {
    id: row.id, slug: row.slug, numero: row.numero, titre: row.titre,
    categorie: row.categorie as Fiche["categorie"],
    priorite: row.priorite as Fiche["priorite"],
    mnemonique: row.mnemonique ?? undefined,
    resume: row.resume,
    etapes: parseJson<Etape[]>(row.etapes, []),
    contacts_lies: row.contacts.map((c) => c.contactId),
    references: parseJson<string[]>(row.references, []),
    avis_obligatoires: parseJson<string[]>(row.avisObligatoires, []),
  };
}

// ─── Mnémoniques ──────────────────────────────────────────────────────────────

export async function getAllMnemoniques(): Promise<Mnemonique[]> {
  const rows = await prisma.mnemonique.findMany({ orderBy: { acronyme: "asc" } });
  return rows.map(dbToMnemonique);
}

function dbToMnemonique(row: {
  id: string; acronyme: string; titre: string; description: string;
  lettres: string; contexte: string | null; couleur: string | null;
}): Mnemonique {
  return {
    id: row.id, acronyme: row.acronyme, titre: row.titre, description: row.description,
    lettres: parseJson<LettreAcronyme[]>(row.lettres, []),
    contexte: row.contexte ?? undefined,
    couleur: row.couleur as Mnemonique["couleur"] ?? undefined,
  };
}

// ─── Abréviations ─────────────────────────────────────────────────────────────

export async function getAllAbreviations(): Promise<Abréviation[]> {
  const rows = await prisma.abreviation.findMany({ orderBy: { sigle: "asc" } });
  return rows.map((r) => ({ sigle: r.sigle, definition: r.definition }));
}

// ─── Postes ────────────────────────────────────────────────────────────────────

import type { Poste, AnnuaireSection, CircuitVoie, Dbc, PNSensiblePoste, ProcedureCle } from "./types";

export async function getAllPostes(): Promise<Poste[]> {
  const rows = await prisma.poste.findMany({
    orderBy: { nom: "asc" },
    include: { secteur: { select: { slug: true } } },
  });
  return rows.map(dbToPoste);
}

export async function getPosteBySlug(slug: string): Promise<Poste | null> {
  const row = await prisma.poste.findUnique({
    where: { slug },
    include: { secteur: { select: { slug: true } } },
  });
  return row ? dbToPoste(row) : null;
}

function dbToPoste(row: {
  id: string; slug: string; nom: string; typePoste: string; lignes: string;
  adresse: string; horaires: string; electrification: string; systemeBlock: string;
  annuaire: string; circuitsVoie: string; pnSensibles: string; particularites: string;
  proceduresCles: string; dbc: string | null; rex: string | null;
  secteur: { slug: string } | null;
}): Poste {
  return {
    id: row.id, slug: row.slug, nom: row.nom,
    type_poste: row.typePoste,
    lignes: parseJson<string[]>(row.lignes, []),
    adresse: row.adresse, horaires: row.horaires, electrification: row.electrification,
    systeme_block: row.systemeBlock,
    annuaire: parseJson<AnnuaireSection[]>(row.annuaire, []),
    circuits_voie: parseJson<CircuitVoie[]>(row.circuitsVoie, []),
    pn_sensibles: parseJson<PNSensiblePoste[]>(row.pnSensibles, []),
    particularites: parseJson<string[]>(row.particularites, []),
    procedures_cles: parseJson<ProcedureCle[]>(row.proceduresCles, []),
    dbc: parseJson<Dbc[]>(row.dbc, []),
    rex: parseJson<string[]>(row.rex, []),
    secteur_slug: row.secteur?.slug ?? undefined,
  };
}

// ─── Points d'accès ferroviaires ──────────────────────────────────────────────

export async function getAllAccesRail(): Promise<AccesRail[]> {
  const rows = await prisma.accesRail.findMany({
    orderBy: [{ ligne: "asc" }, { pk: "asc" }],
  });
  return rows.map(dbToAccesRail);
}

export async function getAccesRailById(id: string): Promise<AccesRail | null> {
  const row = await prisma.accesRail.findUnique({ where: { id } });
  return row ? dbToAccesRail(row) : null;
}

export async function getDistinctLignesAcces(): Promise<string[]> {
  const rows = await prisma.accesRail.findMany({
    select: { ligne: true },
    distinct: ["ligne"],
    orderBy: { ligne: "asc" },
  });
  return rows.map((r) => r.ligne);
}

function dbToAccesRail(row: {
  id: string; ligne: string; pk: string; type: string | null; identifiant: string | null;
  nomAffiche: string; nomComplet: string; latitude: number; longitude: number;
  description: string | null; source: string;
}): AccesRail {
  return {
    id: row.id, ligne: row.ligne, pk: row.pk,
    type: row.type ?? undefined,
    identifiant: row.identifiant ?? undefined,
    nomAffiche: row.nomAffiche,
    nomComplet: row.nomComplet,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description ?? undefined,
    source: row.source as AccesRail["source"],
  };
}
