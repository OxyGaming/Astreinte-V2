export type Priorite = "urgente" | "normale";
export type Categorie =
  | "accident"
  | "incident"
  | "securite"
  | "gestion-agent"
  | "evacuation";

export interface Etape {
  ordre: number;
  titre: string;
  description: string;
  critique?: boolean;
  actions?: string[];
}

export interface Fiche {
  id: string;
  slug: string;
  numero: number;
  titre: string;
  categorie: Categorie;
  priorite: Priorite;
  mnemonique?: string;
  resume: string;
  etapes: Etape[];
  contacts_lies?: string[];
  references?: string[];
  avis_obligatoires?: string[];
  liens?: LienRef[];
  featured?: boolean;
}

export interface Contact {
  id: string;
  nom: string;
  role: string;
  categorie: "urgence" | "astreinte" | "encadrement" | "externe";
  telephone: string;
  telephone_alt?: string;
  note?: string;
  disponibilite?: string;
  /** Rattachement optionnel à un secteur (évolution métier, non affiché en UI pour l'instant) */
  secteur_id?: string;
}

export interface PointAcces {
  nom: string;
  adresse?: string;
  gps?: string;
  note?: string;
  code?: string;
  reference?: string;
}

export interface Procedure {
  titre: string;
  description: string;
  etapes?: string[];
  critique?: boolean;
  reference?: string;
}

export interface PassageNiveau {
  numero: string;
  axe?: string;
  contact_urgence?: string;
  note?: string;
}

export interface Secteur {
  id: string;
  slug: string;
  nom: string;
  ligne: string;
  trajet: string;
  description: string;
  points_acces: PointAcces[];
  procedures: Procedure[];
  pn?: PassageNiveau[];
  liens?: LienRef[];
}

export interface LettreAcronyme {
  lettre: string;
  signification: string;
  detail?: string;
}

export interface Mnemonique {
  id: string;
  acronyme: string;
  titre: string;
  description: string;
  lettres: LettreAcronyme[];
  contexte?: string;
  couleur?: "blue" | "amber" | "red" | "green" | "purple";
}

export interface Abréviation {
  sigle: string;
  definition: string;
}

export interface ContactPoste {
  nom: string;
  role?: string;
  telephone: string;
  note?: string;
  // ─── Enrichissements résolution contact lié ──────────────────────────────────
  telephoneAlt?: string;
  disponibilite?: string;
  contactId?: string;  // présent si entrée liée
  linked?: boolean;    // true si résolu depuis le référentiel
  orphan?: boolean;    // true si contactId renseigné mais contact introuvable
}

export interface AnnuaireSection {
  titre: string;
  contacts: ContactPoste[];
}

export interface AnnuaireEntry {
  section?: string;
  ordre: number;
  nom: string;        // nom libre OU snapshot du contact lié (fallback si supprimé)
  fonction?: string;
  telephone?: string; // téléphone libre OU snapshot du contact lié
  email?: string;
  note?: string;
  // ─── Liaison contact ────────────────────────────────────────────────────────
  /** Si défini : entrée liée à un contact du référentiel */
  contactId?: string;
  /** Libellé d'affichage personnalisé (remplace nom du contact si renseigné) */
  label?: string;
}

export interface CircuitVoie {
  designation: string;
  voie?: string;
  delai_max?: string;
  note?: string;
}

export interface Dbc {
  designation: string;
  voie?: string;
  note?: string;
}

export interface PNSensiblePoste {
  numero: string;
  contact: string;
  telephone?: string;
  note?: string;
}

export interface ProcedureCle {
  titre: string;
  description: string;
  reference?: string;
}

export interface Poste {
  id: string;
  slug: string;
  nom: string;
  type_poste: string;
  lignes: string[];
  adresse: string;
  horaires: string;
  electrification: string;
  systeme_block: string;
  annuaire: AnnuaireSection[];
  circuits_voie: CircuitVoie[];
  pn_sensibles: PNSensiblePoste[];
  particularites: string[];
  procedures_cles: ProcedureCle[];
  dbc?: Dbc[];
  rex?: string[];
  secteur_slugs: string[];
  liens?: LienRef[];
}

// ─── Points d'accès ferroviaires (GPS) ────────────────────────────────────────

export interface AccesRail {
  id: string;
  ligne: string;
  pk: string;
  type?: string;
  identifiant?: string;
  nomAffiche: string;
  nomComplet: string;
  latitude: number;
  longitude: number;
  description?: string;
  source: "KML" | "BACKOFFICE";
}

// ─── Utilisateurs front-office ─────────────────────────────────────────────────

export type UserRole = "ADMIN" | "EDITOR" | "USER";
export type UserStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  username: string;
  nom: string;
  prenom: string;
  email?: string;
  role: UserRole;
  actif: boolean;
  status: UserStatus;
  poste?: string;
  motif?: string;
  createdAt?: string;
}

// ─── Sessions de fiche ─────────────────────────────────────────────────────────

export interface FicheSession {
  id: string;
  ficheSlug: string;
  ficheTitre: string;
  createdByUserId: string;
  createdByNom: string;
  createdByPrenom: string;
  startedAt: string; // ISO string
  endedAt: string | null;
  status: "active" | "archived";
}

// ─── Journal (entrées unifiées) ────────────────────────────────────────────────

export interface JournalActionEntry {
  kind: "action";
  id: string;
  timestamp: string;
  /** null si l'utilisateur a été supprimé physiquement (FK passée en SetNull). */
  userId: string | null;
  /** Toujours rempli, "Utilisateur supprimé" si la relation est cassée. */
  userNom: string;
  userPrenom: string;
  etapeOrdre: number;
  actionIndex: number;
  actionLabel: string;
  type: "checked" | "unchecked";
  /** Vrai pour les entrées créées hors ligne, en attente de synchronisation. */
  pending?: boolean;
}

export interface JournalCommentEntry {
  kind: "comment";
  id: string;
  timestamp: string;
  /** null si l'utilisateur a été supprimé physiquement (FK passée en SetNull). */
  userId: string | null;
  /** Toujours rempli, "Utilisateur supprimé" si la relation est cassée. */
  userNom: string;
  userPrenom: string;
  message: string;
  /** Vrai pour les entrées créées hors ligne, en attente de synchronisation. */
  pending?: boolean;
}

export type MainCouranteStatus = "pending" | "validated" | "rejected";

export interface MainCourante {
  id: string;
  /** Titre — saisi/édité uniquement par l'admin lors de la validation (nullable). */
  titre?: string;
  /** Code court de la nature (ex "S1", "S9", "RH"). Texte libre. */
  nature?: string;
  /** Libellé long de la catégorie (ex "Signaux"). Texte libre. */
  libelle?: string;
  /** Situation/cas rencontré (saisi par le contributeur). */
  description: string;
  /** Ce qui a été fait/conseillé. */
  solution?: string;
  /** Avis sécurité — renseigné uniquement par l'admin. */
  avisSecurite?: string;
  /** Avis production — renseigné uniquement par l'admin. */
  avisProduction?: string;
  ficheSlug?: string;
  auteurId: string;
  auteurNom: string;
  auteurPrenom: string;
  status: MainCouranteStatus;
  /** Legacy : version éditée libre de la description (conservée pour compat). */
  editedDescription?: string;
  rejetMotif?: string;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  validatedByUserId?: string;
  validatedByNom?: string;
  validatedByPrenom?: string;
}

export type JournalEntry = JournalActionEntry | JournalCommentEntry;

// ─── Liens utiles ──────────────────────────────────────────────────────────────

/** Thématique (catégorie) de la page « Liens utiles » — porte une icône et une couleur. */
export interface LienCategorie {
  id: string;
  nom: string;
  /** Clé d'icône Lucide (cf. src/lib/lien-ui.ts). */
  icon: string;
  /** Clé de couleur d'accent (cf. src/lib/lien-ui.ts). */
  couleur: string;
  ordre: number;
}

/** Entrée de la collection centrale de liens (référentiel). */
export interface Lien {
  id: string;
  libelle: string;
  url: string;
  ordre: number;
  /** Thématique de rattachement (page Liens utiles). */
  categorieId?: string;
}

/**
 * Rattachement d'un lien à une fiche, un secteur, un poste ou une étape de
 * procédure guidée. Calqué sur AnnuaireEntry : soit une référence à la
 * collection (lienId), soit un lien saisi librement (libelle + url).
 */
export interface LienRef {
  /** Si défini : référence à un lien de la collection. */
  lienId?: string;
  /** Libellé d'affichage. Surcharge le libellé du lien lié, ou libellé du lien libre. */
  libelle?: string;
  /** URL — uniquement pour un lien libre (ignoré si lienId est défini). */
  url?: string;
}

/** Lien résolu, prêt à l'affichage (référence collection résolue ou lien libre). */
export interface ResolvedLien {
  libelle: string;
  url: string;
  /** Id du lien de la collection si l'entrée y est rattachée. */
  lienId?: string;
  /** true si l'entrée est rattachée à la collection. */
  linked: boolean;
  /** true si rattachée à la collection mais lien introuvable (supprimé). */
  orphan: boolean;
}
