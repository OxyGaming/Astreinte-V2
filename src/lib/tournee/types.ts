/**
 * Types du module « Tournée terrain » — purs (client + serveur).
 *
 * Deux niveaux :
 *   • MODÈLE  : édité en back-office (colonnes JSON de TourneeModele / TourneeEtape)
 *   • PLAN    : copie figée stockée dans `TourneeRealisation.planSnapshot`.
 *     Les liens et contacts y sont RÉSOLUS au moment de la copie : la
 *     réalisation reste lisible même si la collection évolue ensuite.
 */
import type { LienRef } from "@/lib/types";

// ─── Énumérations ─────────────────────────────────────────────────────────────

export const TOURNEE_ETAPE_TYPES = ["DEPART", "POINT", "PAUSE", "EXERCICE", "RESTITUTION"] as const;
export type TourneeEtapeType = (typeof TOURNEE_ETAPE_TYPES)[number];

export const TOURNEE_ETAPE_TYPE_LABELS: Record<TourneeEtapeType, string> = {
  DEPART: "Départ",
  POINT: "Point terrain",
  PAUSE: "Pause",
  EXERCICE: "Exercice",
  RESTITUTION: "Restitution",
};

export const TOURNEE_BLOC_TYPES = ["SECTION", "ATTENTION", "EXERCICE", "INFO"] as const;
export type TourneeBlocType = (typeof TOURNEE_BLOC_TYPES)[number];

export const TOURNEE_BLOC_TYPE_LABELS: Record<TourneeBlocType, string> = {
  SECTION: "Section",
  ATTENTION: "Encadré « Attention »",
  EXERCICE: "Encadré « Exercice »",
  INFO: "Encadré « Information »",
};

export type TourneeModeleStatut = "BROUILLON" | "PUBLIE" | "ARCHIVE";
export type TourneeMode = "SOLO" | "EQUIPE";
export type TourneeRealisationStatut = "PREPARATION" | "EN_COURS" | "TERMINEE" | "ANNULEE";
export type TourneeParticipantRole = "REFERENT" | "PARTICIPANT";

export const TOURNEE_EVENT_TYPES = [
  "TOURNEE_DEBUT",
  "ETAPE_DEBUT",
  "ETAPE_FIN",
  "ETAPE_IGNOREE",
  "ETAPE_REPRISE",
  "TOURNEE_FIN",
] as const;
export type TourneeEventType = (typeof TOURNEE_EVENT_TYPES)[number];

// ─── Contenu ──────────────────────────────────────────────────────────────────

/** Sous-point localisé (ex. « Point B » à l'intérieur de l'étape Badan P2). */
export interface TourneeLieu {
  libelle: string;
  latitude: number;
  longitude: number;
}

/**
 * Bloc de consignes. `texte` est du texte brut multi-lignes : une ligne
 * commençant par « - » ou « • » est rendue comme une puce, « -- » comme une
 * sous-puce, et **gras** est interprété.
 */
export interface TourneeBloc {
  id: string;
  type: TourneeBlocType;
  titre?: string;
  texte: string;
  lieu?: TourneeLieu | null;
}

export interface TourneeAProposSection {
  id: string;
  titre: string;
  texte: string;
}

export interface TourneeSeuils {
  /** |écart| ≤ tolérance → « dans les temps ». */
  toleranceMin: number;
  /** Retard ≥ seuil → rouge (entre tolérance et seuil → orange). */
  rougeMin: number;
  /** Marge en-deçà de laquelle une étape optionnelle est « juste ». */
  margeConfortMin: number;
}

export const DEFAULT_SEUILS: TourneeSeuils = { toleranceMin: 2, rougeMin: 15, margeConfortMin: 5 };

/** Contact du modèle : fonction propre à la tournée + contact lié OU libre. */
export interface TourneeContactRef {
  id: string;
  fonction: string;
  contactId?: string;
  nom?: string;
  telephone?: string;
}

/** Contact résolu (copie figée). `contactId` permet une résolution live. */
export interface TourneePlanContact {
  fonction: string;
  nom: string;
  telephone: string;
  contactId?: string;
}

export interface TourneePlanLien {
  libelle: string;
  url: string;
}

export interface TourneePhotoRef {
  id: string;
  caption?: string | null;
}

// ─── Plan (copie figée) ───────────────────────────────────────────────────────

export interface TourneePlanEtape {
  /** Id de l'étape du modèle à la copie (ou id généré si ajoutée par le référent). */
  key: string;
  type: TourneeEtapeType;
  titre: string;
  description?: string | null;
  optionnelle: boolean;
  heureImposee?: string | null;
  dureeMin: number;
  trajetSuivanteMin: number;
  surcoutTrajetMin?: number | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  localisationMasquee: boolean;
  liens: TourneePlanLien[];
  contenu: TourneeBloc[];
  photos: TourneePhotoRef[];
}

export interface TourneePlan {
  modeleId: string | null;
  version: number;
  titre: string;
  sousTitre?: string | null;
  description?: string | null;
  objectif?: string | null;
  aPropos: TourneeAProposSection[];
  heureDepart: string;
  seuils: TourneeSeuils;
  contacts: TourneePlanContact[];
  liens: TourneePlanLien[];
  mentionDiffusion?: string | null;
  etapes: TourneePlanEtape[];
}

// ─── Modèle (forme éditée en back-office) ─────────────────────────────────────

export interface TourneeEtapeInput {
  id?: string;
  type: TourneeEtapeType;
  titre: string;
  description?: string | null;
  optionnelle: boolean;
  heureImposee?: string | null;
  dureeMin: number;
  trajetSuivanteMin: number;
  surcoutTrajetMin?: number | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  localisationMasquee: boolean;
  liens: LienRef[];
  contenu: TourneeBloc[];
}

// ─── Événements ───────────────────────────────────────────────────────────────

export interface TourneeEvent {
  type: TourneeEventType;
  etapeKey?: string | null;
  /** Epoch ms (horloge du terminal). */
  at: number;
  /** Clé d'idempotence (journal serveur) — sert à dédoublonner la file locale. */
  clientOpId?: string | null;
}
