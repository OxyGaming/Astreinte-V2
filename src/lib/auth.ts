// Uniquement côté serveur (Server Actions, Route Handlers) — réexporte les helpers edge
export { COOKIE_NAME, COOKIE_MAX_AGE, createUserToken, isValidToken, getUserIdFromToken } from "./auth-edge";

// ─────────────────────────────────────────────────────────────────────────────
// Contrat d'authentification des modules RCI / Livret CIL (bundle portable-rci-cil)
//
// Le bundle d'origine cloisonnait par ÉQUIPE (`teamId`). Cette application n'a
// pas de notion d'équipe : le cloisonnement est porté par **`authorId`**, le
// créateur de la ressource, qui existe déjà sur `Rci` et `CilIncident`.
//
// Règle en vigueur ici :
//   • ADMIN          → accès à toutes les ressources
//   • USER / EDITOR  → accès uniquement si `resource.authorId === user.id`
//
// EDITOR ne gagne AUCUNE visibilité élargie : il conserve seulement ses
// privilèges fonctionnels propres au bundle (réouverture d'un incident clos —
// cf. src/lib/cil/machine.ts), qui s'exercent sur ses propres incidents.
//
// ⚠️ `teamId` est un champ technique inerte, conservé parce que le bundle
// l'exige au niveau du schéma. Il ne doit JAMAIS servir de mécanisme de
// sécurité. Voir les commentaires des modèles `Rci` / `CilIncident`.
//
// Chaîne d'imports : auth.ts → user-auth.ts → auth-edge.ts (acyclique).
// ─────────────────────────────────────────────────────────────────────────────

import { getCurrentUser } from "./user-auth";

export type Role = "ADMIN" | "EDITOR" | "USER";

/**
 * Forme de session attendue par le bundle. Les champs `team*` / `viewAllTeams`
 * / `adminScope*` sont conservés pour la compatibilité de typage avec le code
 * du bundle, mais ne participent PAS au contrôle d'accès de cette application.
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Inerte — voir l'avertissement en tête de fichier. */
  teamId: string | null;
  /** Inerte. */
  teamIds: string[];
  /** Inerte : toujours `false`. Le privilège global passe par `role === "ADMIN"`. */
  viewAllTeams: boolean;
  /** Non pertinent ici. */
  adminScopeMode: string | null;
  /** Non pertinent ici. */
  adminTeamId: string | null;
};

/**
 * Valeur technique unique écrite dans `Rci.teamId` / `CilIncident.teamId`.
 * Sans rôle de sécurité : elle satisfait seulement la contrainte NOT NULL du
 * schéma du bundle et les garde-fous de création des routes POST.
 */
export const TECHNICAL_TEAM_ID = "default-team";

/** Ressource cloisonnable : les deux racines du bundle portent ces deux champs. */
export type OwnedResource = { teamId: string; authorId: string };

/**
 * Session courante, ou `null` si non authentifié.
 * Utilisée par les Server Components (pages), qui redirigent vers /login.
 *
 * L'application stocke `nom` / `prenom` et un `username` ; on projette vers la
 * forme attendue par le bundle.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const u = await getCurrentUser();
  if (!u) return null;
  return {
    id: u.id,
    email: u.username,
    name: `${u.prenom} ${u.nom}`.trim() || u.username,
    role: (u.role as Role) ?? "USER",
    teamId: TECHNICAL_TEAM_ID,
    teamIds: [TECHNICAL_TEAM_ID],
    viewAllTeams: false,
    adminScopeMode: null,
    adminTeamId: null,
  };
}

/**
 * Idem, mais côté Route Handler : **lève** une `Response` 401 au lieu de
 * renvoyer `null`.
 *
 * ⚠️ Ce `throw` est volontaire et fait partie du contrat. Les routes du bundle
 * font `try { u = await requireUser() } catch (r) { return r as Response }`.
 * Transformer ce throw en return ferait remonter des 500 au lieu des 401.
 */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) {
    throw new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return u;
}

/**
 * Autorisation d'ACCÈS à une ressource (lecture détaillée, écriture,
 * suppression, génération de document). À appeler après le `findUnique`, avant
 * toute action.
 *
 * Signature élargie par rapport au bundle d'origine, qui ne recevait que le
 * `teamId` : sans `authorId`, aucun cloisonnement réel n'était possible dans
 * une application sans équipes.
 *
 * Pour les ressources filles du CIL (dépêches, événements, intervenants,
 * autorisations, signatures), passer l'incident parent : c'est lui qui porte
 * l'`authorId`.
 */
export function assertTeamAccess(u: SessionUser, resource: OwnedResource): boolean {
  if (u.role === "ADMIN") return true;
  return resource.authorId === u.id;
}

/**
 * Filtre Prisma de LECTURE pour les listes, à étaler à la racine d'un `where` :
 * `where: { ...teamScope(u) }`.
 *
 * ⚠️ Ne JAMAIS placer le résultat dans une branche d'`OR` : quand il vaut `{}`
 * (cas ADMIN), Prisma élimine la branche vide au lieu de la traiter comme
 * « toujours vrai », et la condition se réduit silencieusement aux autres
 * branches — les données deviennent invisibles sans erreur.
 */
export function teamScope(u: SessionUser): { authorId?: string } {
  if (u.role === "ADMIN") return {};
  return { authorId: u.id };
}
