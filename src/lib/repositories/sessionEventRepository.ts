/**
 * Repository de lecture unifié — événements de sessions procédures.
 *
 * Fusionne SessionProcedureEvent (actifs) et SessionProcedureEventArchive
 * en une vue cohérente, triée par sequence.
 *
 * Stratégie de déduplication :
 *   Pendant un archivage partiel, un event peut exister dans les deux tables
 *   simultanément (copié mais pas encore supprimé de l'actif).
 *   Règle : l'event actif est toujours prioritaire — les archivés dont l'id
 *   est déjà dans la table active sont filtrés.
 *
 * Ce repository est en lecture seule. Toute écriture dans l'archive
 *  passe exclusivement par le batch archiveSessionEvents.ts.
 */

import { prisma } from "@/lib/prisma";

// ─── Types publics ────────────────────────────────────────────────────────────

/** Représentation unifiée d'un événement, quelle que soit sa table d'origine. */
export interface SessionEventEntry {
  id:          string;
  sessionId:   string;
  sequence:    number;
  type:        string;
  etapeId:     string | null;
  actionId:    string | null;
  valeur:      string | null;
  payload:     string;        // JSON brut — source of truth
  actorNom:    string | null;
  occurredAt:  Date;
  fromArchive: boolean;       // false = table active, true = table archive
  archivedAt:  Date | null;   // null si fromArchive = false
}

/** Session + totalité de ses événements fusionnés. */
export interface SessionWithEvents {
  session: {
    id:                string;
    procedureSnapshot: string;   // JSON brut — à parser selon besoin
    posteSlug:         string;
    agentNom:          string | null;
    statut:            string;
    etapeIndex:        number;
    synthese:          string | null;  // JSON brut — null jusqu'à la clôture
    startedAt:         Date;
    completedAt:       Date | null;
    eventsArchived:    boolean;
    eventsArchivedAt:  Date | null;
  };
  events: SessionEventEntry[];
}

// ─── Lecture des événements ───────────────────────────────────────────────────

/**
 * Retourne tous les événements d'une session (actifs + archivés),
 * triés par sequence croissante.
 *
 * Retourne [] si la session n'a aucun événement (ou n'existe pas).
 */
export async function getEventsForSession(
  sessionId: string
): Promise<SessionEventEntry[]> {
  // Lecture parallèle des deux tables — pas de transaction nécessaire en lecture.
  // Le seul cas de chevauchement (archivage partiel en cours) est géré
  // par la déduplication ci-dessous.
  const [active, archived] = await Promise.all([
    prisma.sessionProcedureEvent.findMany({
      where:   { sessionId },
      orderBy: { sequence: "asc" },
    }),
    prisma.sessionProcedureEventArchive.findMany({
      where:   { sessionId },
      orderBy: { sequence: "asc" },
    }),
  ]);

  // Index des IDs actifs pour la déduplication O(1)
  const activeIds = new Set(active.map(e => e.id));

  const activeEntries: SessionEventEntry[] = active.map(e => ({
    id:          e.id,
    sessionId:   e.sessionId,
    sequence:    e.sequence,
    type:        e.type,
    etapeId:     e.etapeId,
    actionId:    e.actionId,
    valeur:      e.valeur,
    payload:     e.payload,
    actorNom:    e.actorNom,
    occurredAt:  e.occurredAt,
    fromArchive: false,
    archivedAt:  null,
  }));

  // Exclut les events dont l'id est déjà présent en table active
  // (fenêtre d'archivage partiel : créés en archive, pas encore supprimés de l'actif)
  const archivedEntries: SessionEventEntry[] = archived
    .filter(e => !activeIds.has(e.id))
    .map(e => ({
      id:          e.id,
      sessionId:   e.sessionId,
      sequence:    e.sequence,
      type:        e.type,
      etapeId:     e.etapeId,
      actionId:    e.actionId,
      valeur:      e.valeur,
      payload:     e.payload,
      actorNom:    e.actorNom,
      occurredAt:  e.occurredAt,
      fromArchive: true,
      archivedAt:  e.archivedAt,
    }));

  // Tri global par sequence — garantit l'ordre correct même en cas de mix
  return [...activeEntries, ...archivedEntries].sort(
    (a, b) => a.sequence - b.sequence
  );
}

// ─── Lecture session + événements ─────────────────────────────────────────────

/**
 * Retourne la session et l'intégralité de ses événements (actifs + archivés).
 * Retourne null si la session est introuvable.
 */
export async function getSessionWithEvents(
  sessionId: string
): Promise<SessionWithEvents | null> {
  const session = await prisma.sessionProcedure.findUnique({
    where:  { id: sessionId },
    select: {
      id:                true,
      procedureSnapshot: true,
      posteSlug:         true,
      agentNom:          true,
      statut:            true,
      etapeIndex:        true,
      synthese:          true,
      startedAt:         true,
      completedAt:       true,
      eventsArchived:    true,
      eventsArchivedAt:  true,
    },
  });

  if (!session) return null;

  const events = await getEventsForSession(sessionId);

  return { session, events };
}
