/**
 * Tests unitaires — sessionEventRepository
 *
 * Cas couverts :
 *   1.  Session sans aucun événement → tableau vide
 *   2.  Events uniquement en table active → fromArchive = false sur tous
 *   3.  Events uniquement en table archive → fromArchive = true sur tous
 *   4.  Déduplication : event présent dans les deux tables
 *         → apparaît une seule fois, fromArchive = false (actif prioritaire)
 *   5.  Mix partiel : certains en actif, d'autres en archive uniquement
 *         → les deux apparaissent, correctement marqués
 *   6.  Tri par sequence croissant, indépendamment de la source
 *   7.  getSessionWithEvents → null si session introuvable
 *   8.  getSessionWithEvents → retourne session + events fusionnés
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";

// ─── Mock de @/lib/prisma ─────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sessionProcedureEvent: {
      findMany: vi.fn(),
    },
    sessionProcedureEventArchive: {
      findMany: vi.fn(),
    },
    sessionProcedure: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getEventsForSession,
  getSessionWithEvents,
} from "../sessionEventRepository";

// ─── Typage des mocks ─────────────────────────────────────────────────────────

const m = prisma as {
  sessionProcedureEvent:        { findMany: MockInstance };
  sessionProcedureEventArchive: { findMany: MockInstance };
  sessionProcedure:             { findUnique: MockInstance };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildActiveEvent(overrides: Partial<{
  id: string; sequence: number; type: string;
  etapeId: string | null; actionId: string | null; valeur: string | null;
}> = {}) {
  return {
    id:          overrides.id        ?? "evt-1",
    sessionId:   "session-abc",
    sequence:    overrides.sequence  ?? 1,
    type:        overrides.type      ?? "reponse_enregistree",
    etapeId:     overrides.etapeId   ?? "etape-1",
    actionId:    overrides.actionId  ?? "action-oui",
    valeur:      overrides.valeur    ?? "true",
    payload:     JSON.stringify({ actionId: "action-oui", valeur: true }),
    actorNom:    "Dupont",
    occurredAt:  new Date("2025-01-01T10:00:00Z"),
  };
}

function buildArchivedEvent(overrides: Partial<{
  id: string; sequence: number;
}> = {}) {
  return {
    ...buildActiveEvent(overrides),
    archivedAt: new Date("2025-04-01T02:00:00Z"),
  };
}

function buildSession() {
  return {
    id:                "session-abc",
    procedureSnapshot: JSON.stringify({ titre: "Cessation voie principale" }),
    posteSlug:         "poste-paris-nord",
    agentNom:          "Dupont",
    statut:            "terminee",
    etapeIndex:        3,
    synthese:          JSON.stringify({ statut: "possible" }),
    startedAt:         new Date("2025-01-01T08:00:00Z"),
    completedAt:       new Date("2025-01-01T09:30:00Z"),
    eventsArchived:    false,
    eventsArchivedAt:  null,
  };
}

// ─── getEventsForSession ──────────────────────────────────────────────────────

describe("getEventsForSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Session sans événements ────────────────────────────────────────────

  it("retourne [] si la session n'a aucun événement dans aucune des deux tables", async () => {
    m.sessionProcedureEvent.findMany.mockResolvedValue([]);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue([]);

    const result = await getEventsForSession("session-abc");

    expect(result).toHaveLength(0);
  });

  // ── 2. Events uniquement en table active ──────────────────────────────────

  it("retourne les events actifs avec fromArchive=false et archivedAt=null", async () => {
    const events = [
      buildActiveEvent({ id: "e1", sequence: 1 }),
      buildActiveEvent({ id: "e2", sequence: 2 }),
    ];
    m.sessionProcedureEvent.findMany.mockResolvedValue(events);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue([]);

    const result = await getEventsForSession("session-abc");

    expect(result).toHaveLength(2);
    result.forEach(e => {
      expect(e.fromArchive).toBe(false);
      expect(e.archivedAt).toBeNull();
    });
  });

  // ── 3. Events uniquement en table archive ─────────────────────────────────

  it("retourne les events archivés avec fromArchive=true et archivedAt renseigné", async () => {
    const archived = [
      buildArchivedEvent({ id: "e1", sequence: 1 }),
      buildArchivedEvent({ id: "e2", sequence: 2 }),
    ];
    m.sessionProcedureEvent.findMany.mockResolvedValue([]);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue(archived);

    const result = await getEventsForSession("session-abc");

    expect(result).toHaveLength(2);
    result.forEach(e => {
      expect(e.fromArchive).toBe(true);
      expect(e.archivedAt).toBeInstanceOf(Date);
    });
  });

  // ── 4. Déduplication : event dans les deux tables ─────────────────────────
  // Simule la fenêtre d'archivage partiel : l'event a été copié en archive
  // mais pas encore supprimé de l'actif.

  it("déduplique : un event présent dans les deux tables n'apparaît qu'une fois, fromArchive=false", async () => {
    const activeEvent   = buildActiveEvent({ id: "e1", sequence: 1 });
    const archivedEvent = buildArchivedEvent({ id: "e1", sequence: 1 }); // même id

    m.sessionProcedureEvent.findMany.mockResolvedValue([activeEvent]);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue([archivedEvent]);

    const result = await getEventsForSession("session-abc");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e1");
    expect(result[0].fromArchive).toBe(false); // actif prioritaire
    expect(result[0].archivedAt).toBeNull();
  });

  // ── 5. Mix partiel : certains en actif, d'autres en archive uniquement ────
  // Cas réel après une passe partielle : e1 toujours en actif (résiduel),
  // e2 et e3 entièrement archivés.

  it("fusionne correctement actifs et archivés sans doublon", async () => {
    const active   = [buildActiveEvent({ id: "e1", sequence: 1 })];
    const archived = [
      buildArchivedEvent({ id: "e1", sequence: 1 }), // doublon → filtré
      buildArchivedEvent({ id: "e2", sequence: 2 }), // unique archive → conservé
      buildArchivedEvent({ id: "e3", sequence: 3 }), // unique archive → conservé
    ];

    m.sessionProcedureEvent.findMany.mockResolvedValue(active);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue(archived);

    const result = await getEventsForSession("session-abc");

    expect(result).toHaveLength(3);

    const ids = result.map(e => e.id);
    expect(ids).toContain("e1");
    expect(ids).toContain("e2");
    expect(ids).toContain("e3");

    // e1 vient de l'actif
    expect(result.find(e => e.id === "e1")?.fromArchive).toBe(false);
    // e2 et e3 viennent de l'archive
    expect(result.find(e => e.id === "e2")?.fromArchive).toBe(true);
    expect(result.find(e => e.id === "e3")?.fromArchive).toBe(true);
  });

  // ── 6. Tri par sequence croissant ─────────────────────────────────────────
  // Les deux tables renvoient les events dans l'ordre, mais le merge
  // peut les interleaver. Le tri final doit garantir l'ordre global.

  it("trie le résultat par sequence croissante, quelle que soit la source", async () => {
    // e1 (seq 1) en archive, e2 (seq 2) en actif, e3 (seq 3) en archive
    const active   = [buildActiveEvent({ id: "e2", sequence: 2 })];
    const archived = [
      buildArchivedEvent({ id: "e1", sequence: 1 }),
      buildArchivedEvent({ id: "e3", sequence: 3 }),
    ];

    m.sessionProcedureEvent.findMany.mockResolvedValue(active);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue(archived);

    const result = await getEventsForSession("session-abc");

    expect(result.map(e => e.sequence)).toEqual([1, 2, 3]);
    expect(result.map(e => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  // ── Vérification des arguments passés à Prisma ────────────────────────────

  it("passe le sessionId correct aux deux requêtes Prisma", async () => {
    m.sessionProcedureEvent.findMany.mockResolvedValue([]);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue([]);

    await getEventsForSession("session-xyz");

    expect(m.sessionProcedureEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: "session-xyz" } })
    );
    expect(m.sessionProcedureEventArchive.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: "session-xyz" } })
    );
  });
});

// ─── getSessionWithEvents ─────────────────────────────────────────────────────

describe("getSessionWithEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 7. Session introuvable ────────────────────────────────────────────────

  it("retourne null si la session est introuvable", async () => {
    m.sessionProcedure.findUnique.mockResolvedValue(null);
    // findMany ne doit pas être appelé si la session n'existe pas
    m.sessionProcedureEvent.findMany.mockResolvedValue([]);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue([]);

    const result = await getSessionWithEvents("session-inexistante");

    expect(result).toBeNull();
  });

  // ── 8. Session trouvée : retourne session + events fusionnés ──────────────

  it("retourne la session et ses événements fusionnés quand la session existe", async () => {
    const session  = buildSession();
    const active   = [buildActiveEvent({ id: "e1", sequence: 1 })];
    const archived = [buildArchivedEvent({ id: "e2", sequence: 2 })];

    m.sessionProcedure.findUnique.mockResolvedValue(session);
    m.sessionProcedureEvent.findMany.mockResolvedValue(active);
    m.sessionProcedureEventArchive.findMany.mockResolvedValue(archived);

    const result = await getSessionWithEvents("session-abc");

    expect(result).not.toBeNull();
    expect(result!.session.id).toBe("session-abc");
    expect(result!.session.statut).toBe("terminee");
    expect(result!.events).toHaveLength(2);
    expect(result!.events[0].id).toBe("e1");
    expect(result!.events[1].id).toBe("e2");
  });

  // ── Vérification du select Prisma ─────────────────────────────────────────

  it("interroge sessionProcedure.findUnique avec le bon id et les champs requis", async () => {
    m.sessionProcedure.findUnique.mockResolvedValue(null);

    await getSessionWithEvents("session-abc");

    const call = m.sessionProcedure.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: "session-abc" });
    // Vérifie que les champs essentiels sont bien sélectionnés
    expect(call.select).toMatchObject({
      id:                true,
      procedureSnapshot: true,
      statut:            true,
      eventsArchived:    true,
    });
  });
});
