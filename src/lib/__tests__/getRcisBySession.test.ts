/**
 * Test unitaire — getRcisBySession (résolution transitive).
 *
 * Vérifie que la page Session interroge les RCI liés DIRECTEMENT (sessionId) ET
 * TRANSITIVEMENT (via le Livret CIL : cilIncident.sessionId), de façon symétrique
 * à getCilsForSession. Sans ce `OR`, un RCI né depuis un Livret (donc sans
 * sessionId propre) était invisible sur /sessions/[id].
 */
import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";

// db.ts enveloppe certaines lectures dans React `cache()` au chargement du
// module — indisponible hors runtime React. On le neutralise (identité).
vi.mock("react", () => ({ cache: <T,>(fn: T) => fn }));

vi.mock("@/lib/prisma", () => ({
  prisma: { rci: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { getRcisBySession } from "@/lib/db";

const m = prisma as unknown as { rci: { findMany: MockInstance } };

beforeEach(() => {
  m.rci.findMany.mockReset();
});

describe("getRcisBySession", () => {
  it("interroge les RCI liés directement OU via le Livret CIL", async () => {
    m.rci.findMany.mockResolvedValue([]);
    await getRcisBySession("s1");
    expect(m.rci.findMany).toHaveBeenCalledTimes(1);
    const arg = m.rci.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({
      OR: [{ sessionId: "s1" }, { cilIncident: { sessionId: "s1" } }],
    });
  });

  it("mappe les lignes (updatedAt en ISO)", async () => {
    const now = new Date("2026-07-24T10:00:00.000Z");
    m.rci.findMany.mockResolvedValue([
      { id: "r1", status: "DRAFT", title: "T", dossierNumber: "D", updatedAt: now },
    ]);
    const out = await getRcisBySession("s1");
    expect(out).toEqual([
      {
        id: "r1",
        status: "DRAFT",
        title: "T",
        dossierNumber: "D",
        updatedAt: "2026-07-24T10:00:00.000Z",
      },
    ]);
  });
});
