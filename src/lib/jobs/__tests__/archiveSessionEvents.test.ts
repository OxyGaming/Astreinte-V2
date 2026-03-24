/**
 * Tests unitaires — archiveSingleSession + runArchiveBatch
 *
 * Cas critiques couverts :
 *   1. Session introuvable → skipped
 *   2. Session déjà archivée → skipped (idempotence)
 *   3. Session sans événements → archived (flag posé directement, hors transaction)
 *   4. Cas nominal : N events, count résiduel = 0 → archived, flag posé dans transaction
 *   5. Cas partiel : événement résiduel détecté (count = 1) → partial, flag NON posé
 *   6. Relance après crash (events déjà supprimés, flag pas encore posé) → archived
 *   7. Idempotence de la copie : createMany appelé avec skipDuplicates
 *   8. Suppression sur liste close uniquement (WHERE id IN, pas WHERE sessionId)
 *   9. runArchiveBatch : compteurs processed / partial / errors corrects
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";

// ─── Mock de @/lib/prisma ────────────────────────────────────────────────────
// vi.mock est hissé avant les imports par vitest.
// La factory crée la structure initiale ; les valeurs de retour sont
// configurées dans chaque test via mockResolvedValue / mockImplementation.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sessionProcedure: {
      findUnique: vi.fn(),
      update:     vi.fn(),
      findMany:   vi.fn(),
    },
    sessionProcedureEvent: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Import après le mock pour que le module reçoive l'objet bouchonné.
import { prisma } from "@/lib/prisma";
import {
  archiveSingleSession,
  runArchiveBatch,
  RETENTION_DAYS,
} from "../archiveSessionEvents";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Crée un objet tx (client transaction) avec des mocks indépendants. */
function buildTx(remainingCount = 0) {
  return {
    sessionProcedureEventArchive: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    sessionProcedureEvent: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count:      vi.fn().mockResolvedValue(remainingCount),
    },
    sessionProcedure: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

/** Crée un faux événement minimal. */
function buildEvent(overrides: Partial<{ id: string; sequence: number }> = {}) {
  return {
    id:         overrides.id       ?? "evt-1",
    sessionId:  "session-abc",
    sequence:   overrides.sequence ?? 1,
    type:       "reponse_enregistree",
    etapeId:    "etape-1",
    actionId:   "action-oui",
    valeur:     "true",
    payload:    JSON.stringify({ actionId: "action-oui", valeur: true }),
    actorNom:   "Dupont",
    occurredAt: new Date("2025-01-01T10:00:00Z"),
  };
}

// Accès typé aux mocks (les types vitest ne sont pas injectés automatiquement).
const m = prisma as {
  sessionProcedure: {
    findUnique: MockInstance;
    update:     MockInstance;
    findMany:   MockInstance;
  };
  sessionProcedureEvent: {
    findMany: MockInstance;
  };
  $transaction: MockInstance;
};

// ─── archiveSingleSession ─────────────────────────────────────────────────────

describe("archiveSingleSession", () => {
  let tx: ReturnType<typeof buildTx>;

  beforeEach(() => {
    vi.clearAllMocks();
    tx = buildTx(); // count résiduel = 0 par défaut
    m.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<void>) => fn(tx));
  });

  // ── 1. Session introuvable ────────────────────────────────────────────────

  it("retourne skipped si la session est introuvable", async () => {
    m.sessionProcedure.findUnique.mockResolvedValue(null);

    const outcome = await archiveSingleSession("session-inexistante");

    expect(outcome).toBe("skipped");
    expect(m.$transaction).not.toHaveBeenCalled();
  });

  // ── 2. Session déjà archivée ──────────────────────────────────────────────

  it("retourne skipped si eventsArchived est déjà true (idempotence)", async () => {
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: true });

    const outcome = await archiveSingleSession("session-abc");

    expect(outcome).toBe("skipped");
    expect(m.$transaction).not.toHaveBeenCalled();
  });

  // ── 3. Session sans événements ────────────────────────────────────────────

  it("retourne archived et pose le flag directement si la session n'a aucun événement", async () => {
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: false });
    m.sessionProcedureEvent.findMany.mockResolvedValue([]);

    const outcome = await archiveSingleSession("session-abc");

    expect(outcome).toBe("archived");
    // Le flag est posé hors transaction (chemin rapide)
    expect(m.sessionProcedure.update).toHaveBeenCalledWith({
      where: { id: "session-abc" },
      data:  expect.objectContaining({ eventsArchived: true }),
    });
    expect(m.$transaction).not.toHaveBeenCalled();
  });

  // ── 4. Cas nominal : archivage complet ────────────────────────────────────

  it("retourne archived et pose le flag quand count résiduel = 0", async () => {
    const events = [buildEvent({ id: "e1", sequence: 1 }), buildEvent({ id: "e2", sequence: 2 })];
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: false });
    m.sessionProcedureEvent.findMany.mockResolvedValue(events);
    // tx.count retourne 0 (défaut du buildTx)

    const outcome = await archiveSingleSession("session-abc");

    expect(outcome).toBe("archived");

    // createMany appelé avec les deux events + archivedAt
    expect(tx.sessionProcedureEventArchive.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ id: "e1" }),
        expect.objectContaining({ id: "e2" }),
        expect.objectContaining({ archivedAt: expect.any(Date) }),
      ]),
      skipDuplicates: true,
    });

    // deleteMany sur la liste close d'IDs, pas sur sessionId
    expect(tx.sessionProcedureEvent.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["e1", "e2"] } },
    });

    // count résiduel vérifié dans la transaction
    expect(tx.sessionProcedureEvent.count).toHaveBeenCalledWith({
      where: { sessionId: "session-abc" },
    });

    // flag posé dans la transaction
    expect(tx.sessionProcedure.update).toHaveBeenCalledWith({
      where: { id: "session-abc" },
      data:  expect.objectContaining({ eventsArchived: true }),
    });
  });

  // ── 5. Cas partiel : événement résiduel ───────────────────────────────────

  it("retourne partial et ne pose PAS le flag si count résiduel > 0", async () => {
    const events = [buildEvent({ id: "e1", sequence: 1 })];
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: false });
    m.sessionProcedureEvent.findMany.mockResolvedValue(events);

    // Simule un événement e2 arrivé après la lecture — count = 1 après deleteMany
    tx = buildTx(1);
    m.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<void>) => fn(tx));

    const outcome = await archiveSingleSession("session-abc");

    expect(outcome).toBe("partial");

    // createMany et deleteMany ont bien tourné
    expect(tx.sessionProcedureEventArchive.createMany).toHaveBeenCalled();
    expect(tx.sessionProcedureEvent.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["e1"] } },
    });

    // Le flag ne doit PAS être posé
    expect(tx.sessionProcedure.update).not.toHaveBeenCalled();
  });

  // ── 6. Relance après crash (events déjà supprimés, flag pas encore posé) ──

  it("retourne archived si les events ont déjà été supprimés (crash après deleteMany)", async () => {
    // État après crash : events vides en table active, flag toujours false
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: false });
    m.sessionProcedureEvent.findMany.mockResolvedValue([]); // table active vide

    const outcome = await archiveSingleSession("session-abc");

    // Chemin "0 events" → flag posé directement, pas de transaction
    expect(outcome).toBe("archived");
    expect(m.sessionProcedure.update).toHaveBeenCalledWith({
      where: { id: "session-abc" },
      data:  expect.objectContaining({ eventsArchived: true }),
    });
    expect(m.$transaction).not.toHaveBeenCalled();
  });

  // ── 7. createMany appelé avec skipDuplicates ──────────────────────────────

  it("appelle createMany avec skipDuplicates: true (copie idempotente)", async () => {
    const events = [buildEvent({ id: "e1", sequence: 1 })];
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: false });
    m.sessionProcedureEvent.findMany.mockResolvedValue(events);

    await archiveSingleSession("session-abc");

    const call = tx.sessionProcedureEventArchive.createMany.mock.calls[0][0];
    expect(call.skipDuplicates).toBe(true);
  });

  // ── 8. deleteMany cible uniquement les IDs de la liste close ─────────────

  it("deleteMany utilise WHERE id IN (liste close) et non WHERE sessionId", async () => {
    const events = [
      buildEvent({ id: "e1", sequence: 1 }),
      buildEvent({ id: "e2", sequence: 2 }),
      buildEvent({ id: "e3", sequence: 3 }),
    ];
    m.sessionProcedure.findUnique.mockResolvedValue({ eventsArchived: false });
    m.sessionProcedureEvent.findMany.mockResolvedValue(events);

    await archiveSingleSession("session-abc");

    const deleteCall = tx.sessionProcedureEvent.deleteMany.mock.calls[0][0];
    // Doit utiliser id.in, pas sessionId
    expect(deleteCall.where).toEqual({ id: { in: ["e1", "e2", "e3"] } });
    expect(deleteCall.where.sessionId).toBeUndefined();
  });
});

// ─── runArchiveBatch ──────────────────────────────────────────────────────────

describe("runArchiveBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne un BatchResult vide si aucune session éligible", async () => {
    m.sessionProcedure.findMany.mockResolvedValue([]);

    const result = await runArchiveBatch();

    expect(result.processed).toBe(0);
    expect(result.partial).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.sessions).toHaveLength(0);
  });

  it("cumule correctement processed et partial", async () => {
    // Deux sessions éligibles
    m.sessionProcedure.findMany.mockResolvedValue([
      { id: "session-1" },
      { id: "session-2" },
    ]);

    // session-1 : findUnique → non archivée, findMany → 1 event, count tx → 0 (archived)
    // session-2 : findUnique → non archivée, findMany → 1 event, count tx → 1 (partial)
    m.sessionProcedure.findUnique
      .mockResolvedValueOnce({ eventsArchived: false }) // session-1
      .mockResolvedValueOnce({ eventsArchived: false }); // session-2

    m.sessionProcedureEvent.findMany
      .mockResolvedValueOnce([buildEvent({ id: "e1", sequence: 1 })]) // session-1
      .mockResolvedValueOnce([buildEvent({ id: "e2", sequence: 1 })]);// session-2

    // Transaction session-1 : count = 0 → archived
    const tx1 = buildTx(0);
    // Transaction session-2 : count = 1 → partial
    const tx2 = buildTx(1);

    m.$transaction
      .mockImplementationOnce(async (fn: (t: typeof tx1) => Promise<void>) => fn(tx1))
      .mockImplementationOnce(async (fn: (t: typeof tx2) => Promise<void>) => fn(tx2));

    const result = await runArchiveBatch();

    expect(result.processed).toBe(1);
    expect(result.partial).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.sessions).toEqual([
      { id: "session-1", outcome: "archived" },
      { id: "session-2", outcome: "partial" },
    ]);
  });

  it("incrémente errors et continue si une session lève une exception", async () => {
    m.sessionProcedure.findMany.mockResolvedValue([
      { id: "session-ok" },
      { id: "session-boom" },
    ]);

    m.sessionProcedure.findUnique
      .mockResolvedValueOnce({ eventsArchived: false }) // session-ok
      .mockRejectedValueOnce(new Error("DB failure"));  // session-boom

    m.sessionProcedureEvent.findMany.mockResolvedValue([]);

    const result = await runArchiveBatch();

    expect(result.processed).toBe(1); // session-ok archivée (0 events)
    expect(result.errors).toBe(1);    // session-boom en erreur
    expect(result.sessions[1]).toMatchObject({
      id:      "session-boom",
      outcome: "error",
      error:   "DB failure",
    });
  });

  it("requête de sélection filtre eventsArchived=false, statut terminé/abandonné, cutoff", async () => {
    m.sessionProcedure.findMany.mockResolvedValue([]);

    await runArchiveBatch();

    const findManyCall = m.sessionProcedure.findMany.mock.calls[0][0];
    expect(findManyCall.where.eventsArchived).toBe(false);
    expect(findManyCall.where.statut).toEqual({ in: ["terminee", "abandonnee"] });
    expect(findManyCall.where.completedAt.lt).toBeInstanceOf(Date);

    // La date de coupure doit être approximativement now() - RETENTION_DAYS
    const cutoffMs = Date.now() - RETENTION_DAYS * 86_400_000;
    const delta = Math.abs(findManyCall.where.completedAt.lt.getTime() - cutoffMs);
    expect(delta).toBeLessThan(2000); // tolérance 2s
  });
});
