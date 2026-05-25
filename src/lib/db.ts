/**
 * Couche d'accès aux données — source unique de vérité (DB Prisma/SQLite)
 * Remplace les imports directs depuis src/data/*.ts dans le front-office.
 */
import { cache } from "react";
import { prisma } from "./prisma";
import { parseLienRefs } from "./liens";
import type { Fiche, Contact, Secteur, Mnemonique, Abréviation, Etape, PointAcces, Procedure, PassageNiveau, LettreAcronyme, AccesRail, User, FicheSession, JournalEntry, MainCourante, Lien, LienCategorie, LienRef, ResolvedLien } from "./types";

// ─── Helpers de désérialisation JSON ─────────────────────────────────────────

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const getAllContacts = cache(async (): Promise<Contact[]> => {
  const rows = await prisma.contact.findMany({ orderBy: [{ categorie: "asc" }, { nom: "asc" }] });
  return rows.map(dbToContact);
});

export async function getContactById(id: string): Promise<Contact | null> {
  const row = await prisma.contact.findUnique({ where: { id } });
  return row ? dbToContact(row) : null;
}

export interface ContactWithFiches extends Contact {
  fiches: { id: string; titre: string; slug: string; numero: number }[];
}

export async function getContactWithFiches(id: string): Promise<ContactWithFiches | null> {
  const row = await prisma.contact.findUnique({
    where: { id },
    include: {
      fiches: {
        include: {
          fiche: { select: { id: true, titre: true, slug: true, numero: true } },
        },
      },
    },
  });
  if (!row) return null;
  return {
    ...dbToContact(row),
    fiches: row.fiches.map((f) => f.fiche),
  };
}

function dbToContact(row: {
  id: string; nom: string; role: string; categorie: string;
  telephone: string; telephoneAlt: string | null; note: string | null;
  disponibilite: string | null; secteurId?: string | null;
}): Contact {
  return {
    id: row.id, nom: row.nom, role: row.role,
    categorie: row.categorie as Contact["categorie"],
    telephone: row.telephone,
    telephone_alt: row.telephoneAlt ?? undefined,
    note: row.note ?? undefined,
    disponibilite: row.disponibilite ?? undefined,
    secteur_id: row.secteurId ?? undefined,
  };
}

// ─── Secteurs ─────────────────────────────────────────────────────────────────

export const getAllSecteurs = cache(async (): Promise<Secteur[]> => {
  const rows = await prisma.secteur.findMany({ orderBy: { nom: "asc" } });
  return rows.map(dbToSecteur);
});

export async function getSecteurBySlug(slug: string): Promise<Secteur | null> {
  const row = await prisma.secteur.findUnique({ where: { slug } });
  return row ? dbToSecteur(row) : null;
}

function dbToSecteur(row: {
  id: string; slug: string; nom: string; ligne: string; trajet: string; description: string;
  pointsAcces: string; procedures: string; pn: string | null; liens: string | null;
}): Secteur {
  return {
    id: row.id, slug: row.slug, nom: row.nom, ligne: row.ligne, trajet: row.trajet, description: row.description,
    points_acces: parseJson<PointAcces[]>(row.pointsAcces, []),
    procedures: parseJson<Procedure[]>(row.procedures, []),
    pn: parseJson<PassageNiveau[]>(row.pn, []),
    liens: parseLienRefs(row.liens),
  };
}

// ─── Fiches ────────────────────────────────────────────────────────────────────

export const getAllFiches = cache(async (): Promise<Fiche[]> => {
  const rows = await prisma.fiche.findMany({
    orderBy: { numero: "asc" },
    include: { contacts: { select: { contactId: true } } },
  });
  return rows.map(dbToFiche);
});

export const getFicheBySlug = cache(async (slug: string): Promise<Fiche | null> => {
  const row = await prisma.fiche.findUnique({
    where: { slug },
    include: { contacts: { select: { contactId: true } } },
  });
  return row ? dbToFiche(row) : null;
});

function dbToFiche(row: {
  id: string; slug: string; numero: number; titre: string; categorie: string; priorite: string;
  mnemonique: string | null; resume: string; etapes: string; references: string | null;
  avisObligatoires: string | null; liens: string | null; featured: boolean; contacts: { contactId: string }[];
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
    liens: parseLienRefs(row.liens),
    featured: row.featured,
  };
}

// ─── Mnémoniques ──────────────────────────────────────────────────────────────

export const getAllMnemoniques = cache(async (): Promise<Mnemonique[]> => {
  const rows = await prisma.mnemonique.findMany({ orderBy: { acronyme: "asc" } });
  return rows.map(dbToMnemonique);
});

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

export const getAllAbreviations = cache(async (): Promise<Abréviation[]> => {
  const rows = await prisma.abreviation.findMany({ orderBy: { sigle: "asc" } });
  return rows.map((r) => ({ sigle: r.sigle, definition: r.definition }));
});

// ─── Postes ────────────────────────────────────────────────────────────────────

import type { Poste, AnnuaireSection, ContactPoste, CircuitVoie, Dbc, PNSensiblePoste, ProcedureCle } from "./types";
import { normalizeAnnuaire } from "./annuaire";

/**
 * Convertit AnnuaireEntry[] (format pivot) → AnnuaireSection[] (format affichage).
 * Les entrées liées conservent leur contactId pour la résolution live côté page.
 *
 * Ne gère plus qu'un seul format en entrée : le format pivot AnnuaireEntry[].
 * La normalisation (legacy → pivot) est déléguée à normalizeAnnuaire() de lib/annuaire.ts.
 */
function entriesToSections(raw: unknown): AnnuaireSection[] {
  const entries = normalizeAnnuaire(raw);
  if (!entries.length) return [];

  const NONE = "\x00no-section\x00";
  const sectionMap = new Map<string, ContactPoste[]>();

  for (const e of entries) {
    const key = e.section?.trim() || NONE;
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key)!.push({
      nom: e.label?.trim() || e.nom,
      role: e.fonction,
      telephone: e.telephone ?? "",
      note: e.note,
      contactId: e.contactId,
      linked: !!e.contactId,
    });
  }

  return [...sectionMap.entries()].map(([titre, contacts]) => ({
    titre: titre === NONE ? "" : titre,
    contacts,
  }));
}

export async function getAllPostes(): Promise<Poste[]> {
  const rows = await prisma.poste.findMany({
    orderBy: { nom: "asc" },
    include: { secteurs: { include: { secteur: { select: { slug: true } } } } },
  });
  return rows.map(dbToPoste);
}

export async function getPosteBySlug(slug: string): Promise<Poste | null> {
  const row = await prisma.poste.findUnique({
    where: { slug },
    include: { secteurs: { include: { secteur: { select: { slug: true } } } } },
  });
  return row ? dbToPoste(row) : null;
}

/** Postes rattachés à un secteur donné (via la jointure poste ↔ secteur). */
export async function getPostesBySecteurSlug(secteurSlug: string): Promise<Poste[]> {
  const all = await getAllPostes();
  return all.filter((p) => p.secteur_slugs.includes(secteurSlug));
}

function dbToPoste(row: {
  id: string; slug: string; nom: string; typePoste: string; lignes: string;
  adresse: string; horaires: string; electrification: string; systemeBlock: string;
  annuaire: string; circuitsVoie: string; pnSensibles: string; particularites: string;
  proceduresCles: string; dbc: string | null; rex: string | null; liens: string | null;
  secteurs: { secteur: { slug: string } }[];
}): Poste {
  return {
    id: row.id, slug: row.slug, nom: row.nom,
    type_poste: row.typePoste,
    lignes: parseJson<string[]>(row.lignes, []),
    adresse: row.adresse, horaires: row.horaires, electrification: row.electrification,
    systeme_block: row.systemeBlock,
    annuaire: entriesToSections(parseJson<unknown>(row.annuaire, [])),
    circuits_voie: parseJson<CircuitVoie[]>(row.circuitsVoie, []),
    pn_sensibles: parseJson<PNSensiblePoste[]>(row.pnSensibles, []),
    particularites: parseJson<string[]>(row.particularites, []),
    procedures_cles: parseJson<ProcedureCle[]>(row.proceduresCles, []),
    dbc: parseJson<Dbc[]>(row.dbc, []),
    rex: parseJson<string[]>(row.rex, []),
    secteur_slugs: row.secteurs.map((ps) => ps.secteur.slug),
    liens: parseLienRefs(row.liens),
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

export async function countPendingMainCourantes(): Promise<number> {
  return prisma.mainCourante.count({ where: { status: "pending" } });
}

export async function countValidatedMainCourantes(): Promise<number> {
  return prisma.mainCourante.count({ where: { status: "validated" } });
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

/**
 * Crée une session, ou renvoie celle déjà créée pour ce clientOpId.
 * Si clientOpId est fourni et qu'une session existe déjà avec cette clé,
 * elle est retournée sans nouvelle insertion (idempotence cross-requête).
 */
export async function createFicheSession(
  ficheSlug: string,
  ficheTitre: string,
  userId: string,
  clientOpId?: string | null
): Promise<FicheSession> {
  if (clientOpId) {
    const existing = await prisma.ficheSession.findUnique({
      where: { clientOpId },
      include: { createdBy: { select: { nom: true, prenom: true } } },
    });
    if (existing) return dbToSession(existing);
  }
  try {
    const row = await prisma.ficheSession.create({
      data: { ficheSlug, ficheTitre, createdByUserId: userId, clientOpId: clientOpId ?? null },
      include: { createdBy: { select: { nom: true, prenom: true } } },
    });
    return dbToSession(row);
  } catch (err) {
    // Race : une autre requête concurrente a inséré la même clientOpId
    // pendant qu'on était entre findUnique et create. On relit et renvoie.
    if (clientOpId && isUniqueConstraintError(err)) {
      const existing = await prisma.ficheSession.findUnique({
        where: { clientOpId },
        include: { createdBy: { select: { nom: true, prenom: true } } },
      });
      if (existing) return dbToSession(existing);
    }
    throw err;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  // Prisma : code "P2002" sur violation de contrainte unique
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

export async function getUserActiveSession(ficheSlug: string, userId: string): Promise<FicheSession | null> {
  const row = await prisma.ficheSession.findFirst({
    where: { ficheSlug, status: "active", createdByUserId: userId },
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

/**
 * Liste des sessions visibles pour un utilisateur donné.
 * - USER : uniquement ses propres sessions
 * - EDITOR / ADMIN : toutes les sessions (supervision)
 */
export async function getSessionsForUser(userId: string, role: "USER" | "EDITOR" | "ADMIN"): Promise<FicheSession[]> {
  const where = role === "USER" ? { createdByUserId: userId } : {};
  const rows = await prisma.ficheSession.findMany({
    where,
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
  type: "checked" | "unchecked",
  clientOpId?: string | null
): Promise<void> {
  try {
    await prisma.ficheActionLog.create({
      data: { sessionId, ficheSlug, etapeOrdre, actionIndex, actionLabel, userId, type, clientOpId: clientOpId ?? null },
    });
  } catch (err) {
    // Idempotence : doublon détecté par l'index unique sur clientOpId → no-op
    if (clientOpId && isUniqueConstraintError(err)) return;
    throw err;
  }
}

export async function addCommentLog(
  sessionId: string,
  ficheSlug: string,
  userId: string,
  message: string,
  clientOpId?: string | null
): Promise<void> {
  try {
    await prisma.ficheCommentLog.create({
      data: { sessionId, ficheSlug, userId, message, clientOpId: clientOpId ?? null },
    });
  } catch (err) {
    if (clientOpId && isUniqueConstraintError(err)) return;
    throw err;
  }
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

  // userId / user peuvent être null si l'auteur a été supprimé physiquement
  // (FK FicheActionLog.userId / FicheCommentLog.userId passées en SetNull —
  // cf. migration 20260525000000_user_relations_setnull). On affiche un
  // libellé neutre plutôt que de planter ou de filtrer l'entrée.
  const DELETED_USER_NOM = "(utilisateur supprimé)";
  const DELETED_USER_PRENOM = "";

  const entries: JournalEntry[] = [
    ...actions.map((a) => ({
      kind: "action" as const,
      id: a.id,
      timestamp: a.timestamp.toISOString(),
      userId: a.userId,
      userNom: a.user?.nom ?? DELETED_USER_NOM,
      userPrenom: a.user?.prenom ?? DELETED_USER_PRENOM,
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
      userNom: c.user?.nom ?? DELETED_USER_NOM,
      userPrenom: c.user?.prenom ?? DELETED_USER_PRENOM,
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

// ─── Main Courante ────────────────────────────────────────────────────────────

function dbToMainCourante(row: {
  id: string;
  titre: string | null;
  nature: string | null;
  libelle: string | null;
  description: string;
  solution: string | null;
  avisSecurite: string | null;
  avisProduction: string | null;
  ficheSlug: string | null;
  auteurId: string;
  status: string;
  editedDescription: string | null;
  rejetMotif: string | null;
  createdAt: Date;
  updatedAt: Date;
  validatedAt: Date | null;
  validatedByUserId: string | null;
  auteur: { nom: string; prenom: string };
  validatedBy: { nom: string; prenom: string } | null;
}): MainCourante {
  return {
    id: row.id,
    titre: row.titre ?? undefined,
    nature: row.nature ?? undefined,
    libelle: row.libelle ?? undefined,
    description: row.description,
    solution: row.solution ?? undefined,
    avisSecurite: row.avisSecurite ?? undefined,
    avisProduction: row.avisProduction ?? undefined,
    ficheSlug: row.ficheSlug ?? undefined,
    auteurId: row.auteurId,
    auteurNom: row.auteur.nom,
    auteurPrenom: row.auteur.prenom,
    status: row.status as MainCourante["status"],
    editedDescription: row.editedDescription ?? undefined,
    rejetMotif: row.rejetMotif ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    validatedAt: row.validatedAt?.toISOString(),
    validatedByUserId: row.validatedByUserId ?? undefined,
    validatedByNom: row.validatedBy?.nom,
    validatedByPrenom: row.validatedBy?.prenom,
  };
}

const MC_INCLUDE = {
  auteur: { select: { nom: true, prenom: true } },
  validatedBy: { select: { nom: true, prenom: true } },
} as const;

/** Entrées validées visibles de tous, avec recherche plein texte optionnelle */
export async function getValidatedMainCourantes(search?: string): Promise<MainCourante[]> {
  const where = search
    ? {
        status: "validated",
        OR: [
          { titre: { contains: search } },
          { nature: { contains: search } },
          { libelle: { contains: search } },
          { description: { contains: search } },
          { solution: { contains: search } },
          { avisSecurite: { contains: search } },
          { avisProduction: { contains: search } },
          { editedDescription: { contains: search } },
        ],
      }
    : { status: "validated" };
  const rows = await prisma.mainCourante.findMany({
    where,
    orderBy: { validatedAt: "desc" },
    include: MC_INCLUDE,
  });
  return rows.map(dbToMainCourante);
}

/** Toutes les entrées (admin) avec filtre status optionnel + recherche */
export async function getAllMainCourantes(status?: string, search?: string): Promise<MainCourante[]> {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { titre: { contains: search } },
      { nature: { contains: search } },
      { libelle: { contains: search } },
      { description: { contains: search } },
      { solution: { contains: search } },
      { avisSecurite: { contains: search } },
      { avisProduction: { contains: search } },
      { editedDescription: { contains: search } },
    ];
  }
  const rows = await prisma.mainCourante.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: MC_INCLUDE,
  });
  return rows.map(dbToMainCourante);
}

/** Entrées soumises par un utilisateur */
export async function getUserMainCourantes(userId: string): Promise<MainCourante[]> {
  const rows = await prisma.mainCourante.findMany({
    where: { auteurId: userId },
    orderBy: { createdAt: "desc" },
    include: MC_INCLUDE,
  });
  return rows.map(dbToMainCourante);
}

export async function getMainCouranteById(id: string): Promise<MainCourante | null> {
  const row = await prisma.mainCourante.findUnique({ where: { id }, include: MC_INCLUDE });
  return row ? dbToMainCourante(row) : null;
}

export interface MainCouranteCreateInput {
  description: string;
  auteurId: string;
  nature?: string;
  libelle?: string;
  solution?: string;
  ficheSlug?: string;
  /** Clé d'idempotence pour le rejeu d'une contribution soumise hors ligne. */
  clientOpId?: string;
}

/**
 * Crée une contribution, ou renvoie celle déjà créée pour ce clientOpId.
 * Garantit l'idempotence du rejeu d'une op `main-courante-create` après un ack
 * perdu (cf. createFicheSession pour le même schéma).
 */
export async function createMainCourante(input: MainCouranteCreateInput): Promise<MainCourante> {
  if (input.clientOpId) {
    const existing = await prisma.mainCourante.findUnique({
      where: { clientOpId: input.clientOpId },
      include: MC_INCLUDE,
    });
    if (existing) return dbToMainCourante(existing);
  }
  try {
    const row = await prisma.mainCourante.create({
      data: {
        description: input.description,
        auteurId: input.auteurId,
        nature: input.nature ?? null,
        libelle: input.libelle ?? null,
        solution: input.solution ?? null,
        ficheSlug: input.ficheSlug ?? null,
        clientOpId: input.clientOpId ?? null,
      },
      include: MC_INCLUDE,
    });
    return dbToMainCourante(row);
  } catch (err) {
    // Race : un drain concurrent a inséré la même clientOpId — on relit et renvoie.
    if (input.clientOpId && isUniqueConstraintError(err)) {
      const existing = await prisma.mainCourante.findUnique({
        where: { clientOpId: input.clientOpId },
        include: MC_INCLUDE,
      });
      if (existing) return dbToMainCourante(existing);
    }
    throw err;
  }
}

export interface MainCouranteUpdateInput {
  titre?: string | null;
  nature?: string | null;
  libelle?: string | null;
  description?: string;
  solution?: string | null;
  avisSecurite?: string | null;
  avisProduction?: string | null;
  ficheSlug?: string | null;
  editedDescription?: string | null;
  status?: string;
  rejetMotif?: string | null;
  validatedByUserId?: string;
}

export async function updateMainCourante(
  id: string,
  data: MainCouranteUpdateInput
): Promise<MainCourante> {
  const validatedAt = data.status === "validated" ? new Date() : undefined;
  const row = await prisma.mainCourante.update({
    where: { id },
    data: {
      ...(data.titre !== undefined && { titre: data.titre }),
      ...(data.nature !== undefined && { nature: data.nature }),
      ...(data.libelle !== undefined && { libelle: data.libelle }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.solution !== undefined && { solution: data.solution }),
      ...(data.avisSecurite !== undefined && { avisSecurite: data.avisSecurite }),
      ...(data.avisProduction !== undefined && { avisProduction: data.avisProduction }),
      ...(data.ficheSlug !== undefined && { ficheSlug: data.ficheSlug }),
      ...(data.editedDescription !== undefined && { editedDescription: data.editedDescription }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.rejetMotif !== undefined && { rejetMotif: data.rejetMotif }),
      ...(data.validatedByUserId !== undefined && { validatedByUserId: data.validatedByUserId }),
      ...(validatedAt && { validatedAt }),
    },
    include: MC_INCLUDE,
  });
  return dbToMainCourante(row);
}

export async function deleteMainCourante(id: string): Promise<void> {
  await prisma.mainCourante.delete({ where: { id } });
}

// ─── Liens utiles ─────────────────────────────────────────────────────────────

/** Collection centrale de liens (référentiel), triée par ordre puis libellé. */
export const getAllLiens = cache(async (): Promise<Lien[]> => {
  const rows = await prisma.lien.findMany({ orderBy: [{ ordre: "asc" }, { libelle: "asc" }] });
  return rows.map((r) => ({ id: r.id, libelle: r.libelle, url: r.url, ordre: r.ordre, categorieId: r.categorieId ?? undefined }));
});

export async function getLienById(id: string): Promise<Lien | null> {
  const row = await prisma.lien.findUnique({ where: { id } });
  return row ? { id: row.id, libelle: row.libelle, url: row.url, ordre: row.ordre, categorieId: row.categorieId ?? undefined } : null;
}

/**
 * Résout des LienRef[] en ResolvedLien[] : récupère en une requête les liens de
 * la collection référencés par lienId, applique les libellés d'affichage et
 * marque les références orphelines (lien supprimé de la collection).
 */
export async function resolveLiens(refs: LienRef[]): Promise<ResolvedLien[]> {
  if (!refs.length) return [];
  const ids = [...new Set(refs.filter((r) => r.lienId).map((r) => r.lienId as string))];
  const collection = ids.length
    ? await prisma.lien.findMany({ where: { id: { in: ids } } })
    : [];
  const byId = new Map(collection.map((l) => [l.id, l]));

  return refs.map((ref): ResolvedLien => {
    if (ref.lienId) {
      const lien = byId.get(ref.lienId);
      if (lien) {
        return {
          libelle: ref.libelle?.trim() || lien.libelle,
          url: lien.url,
          lienId: lien.id,
          linked: true,
          orphan: false,
        };
      }
      return {
        libelle: ref.libelle?.trim() || "Lien indisponible",
        url: "",
        lienId: ref.lienId,
        linked: true,
        orphan: true,
      };
    }
    return {
      libelle: ref.libelle?.trim() || ref.url || "",
      url: (ref.url ?? "").trim(),
      linked: false,
      orphan: false,
    };
  });
}

// ─── Thématiques de liens ─────────────────────────────────────────────────────

/** Toutes les thématiques, triées par ordre puis nom. */
export const getAllLienCategories = cache(async (): Promise<LienCategorie[]> => {
  const rows = await prisma.lienCategorie.findMany({ orderBy: [{ ordre: "asc" }, { nom: "asc" }] });
  return rows.map((r) => ({ id: r.id, nom: r.nom, icon: r.icon, couleur: r.couleur, ordre: r.ordre }));
});

export interface LienCategorieAvecLiens extends LienCategorie {
  liens: Lien[];
}

/**
 * Données du hub /liens-utiles : thématiques ordonnées avec leurs liens,
 * plus les liens sans thématique (section « Autres »).
 */
export async function getLiensHub(): Promise<{
  categories: LienCategorieAvecLiens[];
  autres: Lien[];
}> {
  const [cats, liens] = await Promise.all([
    prisma.lienCategorie.findMany({ orderBy: [{ ordre: "asc" }, { nom: "asc" }] }),
    prisma.lien.findMany({ orderBy: [{ ordre: "asc" }, { libelle: "asc" }] }),
  ]);
  const catIds = new Set(cats.map((c) => c.id));
  const byCat = new Map<string, Lien[]>();
  const autres: Lien[] = [];
  for (const r of liens) {
    const lien: Lien = {
      id: r.id, libelle: r.libelle, url: r.url, ordre: r.ordre,
      categorieId: r.categorieId ?? undefined,
    };
    if (r.categorieId && catIds.has(r.categorieId)) {
      const arr = byCat.get(r.categorieId) ?? [];
      arr.push(lien);
      byCat.set(r.categorieId, arr);
    } else {
      autres.push(lien);
    }
  }
  return {
    categories: cats.map((c) => ({
      id: c.id, nom: c.nom, icon: c.icon, couleur: c.couleur, ordre: c.ordre,
      liens: byCat.get(c.id) ?? [],
    })),
    autres,
  };
}

// ─── Précache hors ligne ──────────────────────────────────────────────────────

/** IDs de tous les documents — pour le préchargement hors ligne des PDF. */
export async function getAllDocumentIds(): Promise<string[]> {
  const rows = await prisma.document.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

/** IDs des sessions de procédure encore en cours — pour le précache hors ligne. */
export async function getActiveProcedureSessionIds(): Promise<string[]> {
  const rows = await prisma.sessionProcedure.findMany({
    where: { statut: "en_cours" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Types de procédure disponibles par slug de poste.
 * Sert à construire les URLs /postes/[slug]/procedures/[type] à précacher.
 */
export async function getPosteProcedureTypes(): Promise<Record<string, string[]>> {
  const postes = await prisma.poste.findMany({
    select: {
      slug: true,
      proceduresMetier: {
        select: { procedure: { select: { typeProcedure: true } } },
      },
    },
  });
  const result: Record<string, string[]> = {};
  for (const p of postes) {
    const types = new Set<string>();
    for (const pp of p.proceduresMetier) types.add(pp.procedure.typeProcedure);
    result[p.slug] = [...types];
  }
  return result;
}
