/**
 * Couche d'accès aux données — source unique de vérité (DB Prisma/SQLite)
 * Remplace les imports directs depuis src/data/*.ts dans le front-office.
 */
import { prisma } from "./prisma";
import type { Fiche, Contact, Secteur, Mnemonique, Abréviation, Etape, PointAcces, Procedure, PassageNiveau, LettreAcronyme, AccesRail, User, FicheSession, JournalEntry } from "./types";

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

// ─── Utilisateurs front-office ─────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] });
  return rows.map(dbToUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? dbToUser(row) : null;
}

export async function getUserByUsername(username: string): Promise<(User & { password: string }) | null> {
  const row = await prisma.user.findUnique({ where: { username } });
  if (!row) return null;
  return { ...dbToUser(row), password: row.password };
}

export async function getPendingRegistrations(): Promise<User[]> {
  const rows = await prisma.user.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(dbToUser);
}

export async function countPendingRegistrations(): Promise<number> {
  return prisma.user.count({ where: { status: "pending" } });
}

function dbToUser(row: {
  id: string; username: string; nom: string; prenom: string;
  email?: string | null; role: string; actif: boolean; status: string;
  poste?: string | null; motif?: string | null; createdAt: Date;
}): User {
  return {
    id: row.id,
    username: row.username,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email ?? undefined,
    role: row.role as User["role"],
    actif: row.actif,
    status: row.status as User["status"],
    poste: row.poste ?? undefined,
    motif: row.motif ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Sessions de fiche ─────────────────────────────────────────────────────────

export async function createFicheSession(
  ficheSlug: string,
  ficheTitre: string,
  userId: string
): Promise<FicheSession> {
  const row = await prisma.ficheSession.create({
    data: { ficheSlug, ficheTitre, createdByUserId: userId },
    include: { createdBy: { select: { nom: true, prenom: true } } },
  });
  return dbToSession(row);
}

export async function getActiveSession(ficheSlug: string): Promise<FicheSession | null> {
  const row = await prisma.ficheSession.findFirst({
    where: { ficheSlug, status: "active" },
    orderBy: { startedAt: "desc" },
    include: { createdBy: { select: { nom: true, prenom: true } } },
  });
  return row ? dbToSession(row) : null;
}

export async function getSessionById(id: string): Promise<FicheSession | null> {
  const row = await prisma.ficheSession.findUnique({
    where: { id },
    include: { createdBy: { select: { nom: true, prenom: true } } },
  });
  return row ? dbToSession(row) : null;
}

export async function getAllSessions(): Promise<FicheSession[]> {
  const rows = await prisma.ficheSession.findMany({
    orderBy: { startedAt: "desc" },
    include: { createdBy: { select: { nom: true, prenom: true } } },
  });
  return rows.map(dbToSession);
}

export async function archiveFicheSession(id: string): Promise<FicheSession> {
  const row = await prisma.ficheSession.update({
    where: { id },
    data: { status: "archived", endedAt: new Date() },
    include: { createdBy: { select: { nom: true, prenom: true } } },
  });
  return dbToSession(row);
}

function dbToSession(row: {
  id: string; ficheSlug: string; ficheTitre: string; createdByUserId: string;
  startedAt: Date; endedAt: Date | null; status: string;
  createdBy: { nom: string; prenom: string };
}): FicheSession {
  return {
    id: row.id,
    ficheSlug: row.ficheSlug,
    ficheTitre: row.ficheTitre,
    createdByUserId: row.createdByUserId,
    createdByNom: row.createdBy.nom,
    createdByPrenom: row.createdBy.prenom,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    status: row.status as FicheSession["status"],
  };
}

// ─── Journal (actions + commentaires) ─────────────────────────────────────────

export async function addActionLog(
  sessionId: string,
  ficheSlug: string,
  etapeOrdre: number,
  actionIndex: number,
  actionLabel: string,
  userId: string,
  type: "checked" | "unchecked"
): Promise<void> {
  await prisma.ficheActionLog.create({
    data: { sessionId, ficheSlug, etapeOrdre, actionIndex, actionLabel, userId, type },
  });
}

export async function addCommentLog(
  sessionId: string,
  ficheSlug: string,
  userId: string,
  message: string
): Promise<void> {
  await prisma.ficheCommentLog.create({
    data: { sessionId, ficheSlug, userId, message },
  });
}

export async function getSessionJournal(sessionId: string): Promise<JournalEntry[]> {
  const [actions, comments] = await Promise.all([
    prisma.ficheActionLog.findMany({
      where: { sessionId },
      include: { user: { select: { nom: true, prenom: true } } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.ficheCommentLog.findMany({
      where: { sessionId },
      include: { user: { select: { nom: true, prenom: true } } },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  const entries: JournalEntry[] = [
    ...actions.map((a) => ({
      kind: "action" as const,
      id: a.id,
      timestamp: a.timestamp.toISOString(),
      userId: a.userId,
      userNom: a.user.nom,
      userPrenom: a.user.prenom,
      etapeOrdre: a.etapeOrdre,
      actionIndex: a.actionIndex,
      actionLabel: a.actionLabel,
      type: a.type as "checked" | "unchecked",
    })),
    ...comments.map((c) => ({
      kind: "comment" as const,
      id: c.id,
      timestamp: c.timestamp.toISOString(),
      userId: c.userId,
      userNom: c.user.nom,
      userPrenom: c.user.prenom,
      message: c.message,
    })),
  ];

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getCheckedActionsForSession(
  sessionId: string
): Promise<{ etapeOrdre: number; actionIndex: number; type: string }[]> {
  // Return only the LAST log entry per action (to get current state)
  const logs = await prisma.ficheActionLog.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
    select: { etapeOrdre: true, actionIndex: true, type: true },
  });
  // Build map: keep last state per action key
  const map = new Map<string, { etapeOrdre: number; actionIndex: number; type: string }>();
  for (const log of logs) {
    map.set(`${log.etapeOrdre}_${log.actionIndex}`, log);
  }
  return [...map.values()];
}
