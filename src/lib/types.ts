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
  userId: string;
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
  userId: string;
  userNom: string;
  userPrenom: string;
  message: string;
  /** Vrai pour les entrées créées hors ligne, en attente de synchronisation. */
  pending?: boolean;
}

export type MainCouranteStatus = "pending" | "validated" | "rejected";

export interface MainCourante {
  id: string;
  titre: string;
  description: string;
  ficheSlug?: string;
  auteurId: string;
  auteurNom: string;
  auteurPrenom: string;
  status: MainCouranteStatus;
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
