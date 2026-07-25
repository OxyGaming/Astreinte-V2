/**
 * triangle/delete — suppression physique **gardée** d'un sommet du triangle
 * Session ↔ RCI ↔ Livret CIL.
 *
 * Principes (décidés en audit) :
 *  - suppression PHYSIQUE, admin-only (l'autorité est vérifiée par la route) ;
 *  - un élément PROBANT n'est jamais altéré indirectement : toute suppression qui
 *    provoquerait un `SetNull`/cascade sur un RCI `FINAL` ou un Livret `CLOSED`
 *    est refusée (`ProbativeBlockError`) — aucune déliaison automatique ;
 *  - un `stateToken` composite (structure des liens + révisions) protège contre
 *    une confirmation sur un état devenu obsolète entre l'aperçu et l'exécution ;
 *  - l'audit est écrit DANS la transaction, donc uniquement si la suppression
 *    réussit entièrement.
 *
 * Server-only. `analyzeDeletion` est en lecture seule (aperçu) ; `executeDeletion`
 * doit être appelée dans `prisma.$transaction`.
 */
import { createHash } from "node:crypto";
import type { Tx } from "./reconcile";
import { logAdminActionTx } from "@/lib/audit";

export type TriangleEntityKind = "rci" | "cil" | "session";
export type ImpactSeverity = "WARNING" | "DANGER";
export type BlockerReason = "SELF_FINAL" | "SELF_CLOSED" | "RCI_FINAL" | "CIL_CLOSED";

/** Acteur de la suppression (projeté depuis la session courante). */
export type DeletionActor = { id: string; nom: string };

/** Un lien qui sera rompu (le voisin survit) — gravité WARNING. */
export interface SeveredLink {
  neighborType: TriangleEntityKind;
  neighborId: string;
  neighborTitle: string;
  neighborStatus: string;
}

/** Un élément probant qui interdit la suppression. */
export interface DeletionBlocker {
  reason: BlockerReason;
  element: { type: TriangleEntityKind; id: string; title: string };
}

/** Aperçu d'impact exposé à l'UI (aucune donnée brute Prisma ne fuit). */
export interface DeletionImpact {
  resource: { type: TriangleEntityKind; id: string; title: string; status: string };
  /** Liens rompus — les voisins survivent (WARNING). */
  severedLinks: SeveredLink[];
  /** Catégories de données perdues définitivement en cascade (DANGER). */
  destroyedData: string[];
  /** Éléments probants qui bloquent la suppression (vide ⇒ supprimable). */
  blockers: DeletionBlocker[];
  severity: ImpactSeverity;
  deletable: boolean;
  /** Jeton d'obsolescence composite — à renvoyer tel quel au DELETE. */
  stateToken: string;
}

export class TriangleEntityNotFoundError extends Error {
  constructor(kind: TriangleEntityKind, id: string) {
    super(`${kind} introuvable (${id})`);
    this.name = "TriangleEntityNotFoundError";
  }
}

export class ProbativeBlockError extends Error {
  blockers: DeletionBlocker[];
  constructor(message: string, blockers: DeletionBlocker[]) {
    super(message);
    this.name = "ProbativeBlockError";
    this.blockers = blockers;
  }
}

export class StaleStateError extends Error {
  constructor(
    message = "L'état a changé depuis l'affichage de l'aperçu. Vérifiez à nouveau les impacts.",
  ) {
    super(message);
    this.name = "StaleStateError";
  }
}

// ─── Représentation interne (jamais exposée) ──────────────────────────────────

/**
 * Nœud normalisé du voisinage. `rev` résume l'état mutable pertinent pour
 * l'obsolescence ; `sessionId`/`cilIncidentId` portent la structure des arêtes.
 */
type Node = {
  kind: TriangleEntityKind;
  id: string;
  title: string;
  status: string;
  rev: string;
  sessionId?: string | null;
  cilIncidentId?: string | null;
};

type Surface = {
  root: Node;
  neighbors: Node[];
  destroyedData: string[];
  blockers: DeletionBlocker[];
};

// ─── Helpers de titre ─────────────────────────────────────────────────────────

function rciTitle(r: { title: string | null; dossierNumber: string | null }): string {
  return r.title?.trim() || r.dossierNumber?.trim() || "RCI sans titre";
}

function cilTitle(c: { reference: string | null; lieu: string }): string {
  return [c.reference, c.lieu].filter(Boolean).join(" · ") || "Livret CIL";
}

// ─── Collecte de la surface d'impact ──────────────────────────────────────────

async function gatherSurface(
  tx: Tx,
  kind: TriangleEntityKind,
  id: string,
): Promise<Surface | null> {
  if (kind === "rci") return gatherRci(tx, id);
  if (kind === "cil") return gatherCil(tx, id);
  return gatherSession(tx, id);
}

async function gatherRci(tx: Tx, id: string): Promise<Surface | null> {
  const rci = await tx.rci.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      dossierNumber: true,
      status: true,
      updatedAt: true,
      sessionId: true,
      cilIncidentId: true,
    },
  });
  if (!rci) return null;

  const root: Node = {
    kind: "rci",
    id: rci.id,
    title: rciTitle(rci),
    status: rci.status,
    rev: rci.updatedAt.toISOString(),
    sessionId: rci.sessionId,
    cilIncidentId: rci.cilIncidentId,
  };

  const neighbors: Node[] = [];
  if (rci.sessionId) {
    const s = await sessionNode(tx, rci.sessionId);
    if (s) neighbors.push(s);
  }
  if (rci.cilIncidentId) {
    const c = await cilNode(tx, rci.cilIncidentId);
    if (c) neighbors.push(c);
  }

  const blockers: DeletionBlocker[] = [];
  if (rci.status === "FINAL") {
    blockers.push({ reason: "SELF_FINAL", element: { type: "rci", id: rci.id, title: root.title } });
  }

  // Un RCI n'a aucune entité fille : rien n'est détruit en cascade.
  return { root, neighbors, destroyedData: [], blockers };
}

async function gatherCil(tx: Tx, id: string): Promise<Surface | null> {
  const cil = await tx.cilIncident.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      lieu: true,
      status: true,
      updatedAt: true,
      sessionId: true,
    },
  });
  if (!cil) return null;

  const root: Node = {
    kind: "cil",
    id: cil.id,
    title: cilTitle(cil),
    status: cil.status,
    rev: cil.updatedAt.toISOString(),
    sessionId: cil.sessionId,
  };

  // Voisins : RCI rattachés (leur lien sera rompu) + la session (détachée).
  const rcis = await tx.rci.findMany({
    where: { cilIncidentId: cil.id },
    select: { id: true, title: true, dossierNumber: true, status: true, updatedAt: true, sessionId: true, cilIncidentId: true },
  });
  const neighbors: Node[] = rcis.map((r) => ({
    kind: "rci" as const,
    id: r.id,
    title: rciTitle(r),
    status: r.status,
    rev: r.updatedAt.toISOString(),
    sessionId: r.sessionId,
    cilIncidentId: r.cilIncidentId,
  }));
  if (cil.sessionId) {
    const s = await sessionNode(tx, cil.sessionId);
    if (s) neighbors.push(s);
  }

  const blockers: DeletionBlocker[] = [];
  if (cil.status === "CLOSED") {
    blockers.push({ reason: "SELF_CLOSED", element: { type: "cil", id: cil.id, title: root.title } });
  }
  for (const r of rcis) {
    if (r.status === "FINAL") {
      blockers.push({ reason: "RCI_FINAL", element: { type: "rci", id: r.id, title: rciTitle(r) } });
    }
  }

  const destroyedData = await cilDestroyedCategories(tx, cil.id);
  return { root, neighbors, destroyedData, blockers };
}

async function gatherSession(tx: Tx, id: string): Promise<Surface | null> {
  const session = await tx.ficheSession.findUnique({
    where: { id },
    select: { id: true, ficheTitre: true, status: true, endedAt: true },
  });
  if (!session) return null;

  const root: Node = {
    kind: "session",
    id: session.id,
    title: session.ficheTitre,
    status: session.status,
    // FicheSession n'a pas d'`updatedAt` : statut + clôture résument son état mutable.
    rev: `${session.status}|${session.endedAt ? session.endedAt.toISOString() : ""}`,
  };

  // Voisins DIRECTS uniquement (sessionId == S) : seuls eux sont mutés (SetNull).
  const rcis = await tx.rci.findMany({
    where: { sessionId: session.id },
    select: { id: true, title: true, dossierNumber: true, status: true, updatedAt: true, sessionId: true, cilIncidentId: true },
  });
  const cils = await tx.cilIncident.findMany({
    where: { sessionId: session.id },
    select: { id: true, reference: true, lieu: true, status: true, updatedAt: true, sessionId: true },
  });

  const neighbors: Node[] = [
    ...rcis.map((r) => ({
      kind: "rci" as const,
      id: r.id,
      title: rciTitle(r),
      status: r.status,
      rev: r.updatedAt.toISOString(),
      sessionId: r.sessionId,
      cilIncidentId: r.cilIncidentId,
    })),
    ...cils.map((c) => ({
      kind: "cil" as const,
      id: c.id,
      title: cilTitle(c),
      status: c.status,
      rev: c.updatedAt.toISOString(),
      sessionId: c.sessionId,
    })),
  ];

  const blockers: DeletionBlocker[] = [];
  for (const r of rcis) {
    if (r.status === "FINAL") {
      blockers.push({ reason: "RCI_FINAL", element: { type: "rci", id: r.id, title: rciTitle(r) } });
    }
  }
  for (const c of cils) {
    if (c.status === "CLOSED") {
      blockers.push({ reason: "CIL_CLOSED", element: { type: "cil", id: c.id, title: cilTitle(c) } });
    }
  }

  const destroyedData = await sessionDestroyedCategories(tx, session.id);
  return { root, neighbors, destroyedData, blockers };
}

async function sessionNode(tx: Tx, id: string): Promise<Node | null> {
  const s = await tx.ficheSession.findUnique({
    where: { id },
    select: { id: true, ficheTitre: true, status: true, endedAt: true },
  });
  if (!s) return null;
  return {
    kind: "session",
    id: s.id,
    title: s.ficheTitre,
    status: s.status,
    rev: `${s.status}|${s.endedAt ? s.endedAt.toISOString() : ""}`,
  };
}

async function cilNode(tx: Tx, id: string): Promise<Node | null> {
  const c = await tx.cilIncident.findUnique({
    where: { id },
    select: { id: true, reference: true, lieu: true, status: true, updatedAt: true, sessionId: true },
  });
  if (!c) return null;
  return {
    kind: "cil",
    id: c.id,
    title: cilTitle(c),
    status: c.status,
    rev: c.updatedAt.toISOString(),
    sessionId: c.sessionId,
  };
}

// ─── Catégories de données détruites en cascade (présence, pas de comptage) ────

async function sessionDestroyedCategories(tx: Tx, sessionId: string): Promise<string[]> {
  const cats: string[] = [];
  if (await tx.ficheActionLog.findFirst({ where: { sessionId }, select: { id: true } })) {
    cats.push("Journal d'actions");
  }
  if (await tx.ficheCommentLog.findFirst({ where: { sessionId }, select: { id: true } })) {
    cats.push("Commentaires de session");
  }
  return cats;
}

async function cilDestroyedCategories(tx: Tx, incidentId: string): Promise<string[]> {
  const cats: string[] = [];
  if (await tx.cilEvent.findFirst({ where: { incidentId }, select: { id: true } })) {
    cats.push("Événements");
  }
  if (await tx.cilDepeche.findFirst({ where: { incidentId }, select: { id: true } })) {
    cats.push("Dépêches");
  }
  if (await tx.cilIntervenant.findFirst({ where: { incidentId }, select: { id: true } })) {
    cats.push("Intervenants");
  }
  if (await tx.cilAutorisation.findFirst({ where: { incidentId }, select: { id: true } })) {
    cats.push("Autorisations");
  }
  if (await tx.cilSignature.findFirst({ where: { incidentId }, select: { id: true } })) {
    cats.push("Signatures");
  }
  return cats;
}

// ─── Jeton d'obsolescence composite ───────────────────────────────────────────

/**
 * Empreinte déterministe de la surface d'impact. Intègre **la structure des
 * arêtes** (pas seulement les révisions) : un rattachement ajouté/retiré change
 * l'ensemble des arêtes, donc le jeton, même si aucun `updatedAt` ne bouge.
 * Tri stable de tous les composants avant hachage. La donnée brute n'est jamais
 * exposée : seul le condensé sort.
 */
function computeStateToken(nodes: Node[]): string {
  const nodeParts = nodes
    .map((n) => `${n.kind}:${n.id}|s=${n.status}|r=${n.rev}`)
    .sort();

  const edgeParts: string[] = [];
  for (const n of nodes) {
    if (n.kind === "rci") {
      if (n.sessionId) edgeParts.push(`rci:${n.id}->session:${n.sessionId}`);
      if (n.cilIncidentId) edgeParts.push(`rci:${n.id}->cil:${n.cilIncidentId}`);
    } else if (n.kind === "cil") {
      if (n.sessionId) edgeParts.push(`cil:${n.id}->session:${n.sessionId}`);
    }
  }
  edgeParts.sort();

  const canonical = JSON.stringify({ n: nodeParts, e: edgeParts });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

// ─── Construction de l'aperçu ─────────────────────────────────────────────────

function buildImpact(s: Surface): DeletionImpact {
  const severedLinks: SeveredLink[] = s.neighbors.map((n) => ({
    neighborType: n.kind,
    neighborId: n.id,
    neighborTitle: n.title,
    neighborStatus: n.status,
  }));
  const severity: ImpactSeverity = s.destroyedData.length > 0 ? "DANGER" : "WARNING";
  const stateToken = computeStateToken([s.root, ...s.neighbors]);

  return {
    resource: { type: s.root.kind, id: s.root.id, title: s.root.title, status: s.root.status },
    severedLinks,
    destroyedData: s.destroyedData,
    blockers: s.blockers,
    severity,
    deletable: s.blockers.length === 0,
    stateToken,
  };
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Aperçu d'impact (lecture seule). Renvoie `null` si la ressource n'existe pas.
 * Peut être appelé avec le client global (`prisma`) hors transaction.
 */
export async function analyzeDeletion(
  tx: Tx,
  kind: TriangleEntityKind,
  id: string,
): Promise<DeletionImpact | null> {
  const s = await gatherSurface(tx, kind, id);
  return s ? buildImpact(s) : null;
}

function blockerMessage(blockers: DeletionBlocker[]): string {
  const b = blockers[0];
  switch (b.reason) {
    case "SELF_FINAL":
      return "Ce RCI est finalisé : suppression interdite.";
    case "SELF_CLOSED":
      return "Ce Livret est clôturé : suppression interdite.";
    case "RCI_FINAL":
      return `Suppression refusée : le RCI finalisé « ${b.element.title} » y est rattaché et ne peut être altéré.`;
    case "CIL_CLOSED":
      return `Suppression refusée : le Livret clôturé « ${b.element.title} » y est rattaché et ne peut être altéré.`;
  }
}

function linksSeveredDetail(kind: TriangleEntityKind, rootId: string, neighbors: Node[]) {
  return neighbors.map((n) => {
    if (kind === "session") {
      // Les voisins pointaient VERS la session.
      return { fromType: n.kind, fromId: n.id, toType: "session" as const, toId: rootId };
    }
    if (kind === "cil") {
      // Les RCI pointaient vers le Livret ; le Livret pointait vers la session.
      return n.kind === "session"
        ? { fromType: "cil" as const, fromId: rootId, toType: "session" as const, toId: n.id }
        : { fromType: n.kind, fromId: n.id, toType: "cil" as const, toId: rootId };
    }
    // kind === "rci" : le RCI pointait vers ses voisins.
    return { fromType: "rci" as const, fromId: rootId, toType: n.kind, toId: n.id };
  });
}

/**
 * Suppression gardée, à exécuter DANS une transaction. Rejoue l'analyse sur
 * l'état réel (source de vérité) :
 *  - re-lecture ⇒ `TriangleEntityNotFoundError` si disparu ;
 *  - `stateToken` recalculé ≠ jeton client ⇒ `StaleStateError` ;
 *  - blockers présents ⇒ `ProbativeBlockError` ;
 * puis supprime et écrit l'audit dans la même transaction (donc seulement en cas
 * de succès complet). Renvoie l'impact réellement appliqué.
 */
export async function executeDeletion(
  tx: Tx,
  kind: TriangleEntityKind,
  id: string,
  actor: DeletionActor,
  clientStateToken: string,
  motif?: string | null,
): Promise<DeletionImpact> {
  const s = await gatherSurface(tx, kind, id);
  if (!s) throw new TriangleEntityNotFoundError(kind, id);

  const impact = buildImpact(s);

  if (clientStateToken !== impact.stateToken) {
    throw new StaleStateError();
  }
  if (!impact.deletable) {
    throw new ProbativeBlockError(blockerMessage(impact.blockers), impact.blockers);
  }

  // Snapshot AVANT suppression (le SetNull/Cascade s'appliquent ensuite en base).
  const detail = {
    resource: { type: kind, id: s.root.id, title: s.root.title, status: s.root.status },
    performedBy: { userId: actor.id, userNom: actor.nom },
    performedAt: new Date().toISOString(),
    linksBefore: {
      sessionId: s.root.sessionId ?? null,
      cilIncidentId: s.root.cilIncidentId ?? null,
    },
    neighbors: s.neighbors.map((n) => ({ type: n.kind, id: n.id, title: n.title, status: n.status })),
    linksSevered: linksSeveredDetail(kind, s.root.id, s.neighbors),
    destroyedData: impact.destroyedData,
    severity: impact.severity,
    motif: motif ?? null,
  };

  if (kind === "rci") {
    await tx.rci.delete({ where: { id } });
  } else if (kind === "cil") {
    await tx.cilIncident.delete({ where: { id } });
  } else {
    await tx.ficheSession.delete({ where: { id } });
  }

  await logAdminActionTx(
    tx,
    actor.id,
    actor.nom,
    "DELETE",
    `triangle-${kind}`,
    id,
    JSON.stringify(detail),
  );

  return impact;
}
