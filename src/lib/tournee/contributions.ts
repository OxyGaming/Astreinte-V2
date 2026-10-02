/**
 * Contributions terrain — constantes partagées (pur).
 * Une contribution est un objet INDÉPENDANT : elle ne modifie jamais le modèle.
 */

export const CONTRIBUTION_TYPES = ["REMISE_CONFORMITE", "ANOMALIE", "INFO_A_MODIFIER", "AMELIORATION", "PHOTO", "AUTRE"] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  REMISE_CONFORMITE: "Remise en conformité",
  ANOMALIE: "Anomalie",
  INFO_A_MODIFIER: "Information à modifier",
  AMELIORATION: "Proposition d'amélioration",
  PHOTO: "Photo complémentaire",
  AUTRE: "Autre",
};

export const CONTRIBUTION_STATUTS = ["NOUVELLE", "EN_ANALYSE", "A_TRAITER", "EN_COURS", "TRAITE", "REFUSE", "ARCHIVE"] as const;
export type ContributionStatut = (typeof CONTRIBUTION_STATUTS)[number];

export const CONTRIBUTION_STATUT_LABELS: Record<ContributionStatut, string> = {
  NOUVELLE: "Nouvelle",
  EN_ANALYSE: "En analyse",
  A_TRAITER: "À traiter",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  REFUSE: "Refusé",
  ARCHIVE: "Archivé",
};

export const CONTRIBUTION_STATUT_STYLE: Record<ContributionStatut, string> = {
  NOUVELLE: "bg-blue-100 text-blue-700",
  EN_ANALYSE: "bg-indigo-100 text-indigo-700",
  A_TRAITER: "bg-amber-100 text-amber-800",
  EN_COURS: "bg-orange-100 text-orange-700",
  TRAITE: "bg-green-100 text-green-700",
  REFUSE: "bg-red-100 text-red-700",
  ARCHIVE: "bg-gray-100 text-gray-500",
};

export const isContributionType = (v: unknown): v is ContributionType =>
  typeof v === "string" && (CONTRIBUTION_TYPES as readonly string[]).includes(v);
export const isContributionStatut = (v: unknown): v is ContributionStatut =>
  typeof v === "string" && (CONTRIBUTION_STATUTS as readonly string[]).includes(v);

export const MAX_PHOTOS_CONTRIBUTION = 5;
