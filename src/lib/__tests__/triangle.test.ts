/**
 * Tests unitaires — reconcileTriangle (cohérence du triangle Session↔RCI↔Livret).
 *
 * On simule la transaction Prisma avec un store en mémoire couvrant exactement
 * les requêtes que le helper émet. Chaque test vérifie l'état FINAL des FK, pas
 * la séquence d'appels — c'est le comportement métier qui compte.
 *
 * Cas couverts (alignés sur la demande) :
 *   1. Session posée sur un RCI seul → seul RCI.sessionId change.
 *   2. Session posée sur un RCI déjà lié à un Livret → la session se propage AUSSI au Livret.
 *   3. Session posée sur un Livret déjà lié à un RCI → la session se propage AUSSI au RCI.
 *   4. Création RCI depuis un Livret qui a une session → le RCI hérite de la session.
 *   5. Refus d'écraser : RCI déjà rattaché à une AUTRE session → conflit.
 *   6. Refus d'écraser : RCI déjà rattaché à un AUTRE Livret → conflit.
 *   7. Refus : sessions divergentes entre RCI et Livret → conflit.
 *   8. Déduction non ambiguë : Livret + session à un seul RCI orphelin → on relie le RCI.
 *   9. Ambiguïté : deux RCI orphelins → on ne devine pas (pas de rattachement).
 */

import { describe, it, expect } from "vitest";
import { reconcileTriangle, TriangleConflictError } from "@/lib/triangle";

// ─── Store en mémoire ─────────────────────────────────────────────────────────

type RciRow = { id: string; sessionId: string | null; cilIncidentId: string | null };
type CilRow = { id: string; sessionId: string | null };

function makeTx(seed: { rcis?: RciRow[]; cils?: CilRow[] }) {
  const rcis = new Map<string, RciRow>((seed.rcis ?? []).map((r) => [r.id, { ...r }]));
  const cils = new Map<string, CilRow>((seed.cils ?? []).map((c) => [c.id, { ...c }]));

  const tx = {
    rci: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        rcis.has(where.id) ? { ...rcis.get(where.id)! } : null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<RciRow> }) => {
        const row = rcis.get(where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { cilIncidentId?: string; sessionId?: string | null };
        data: Partial<RciRow>;
      }) => {
        let count = 0;
        for (const row of rcis.values()) {
          const matchCil =
            where.cilIncidentId === undefined || row.cilIncidentId === where.cilIncidentId;
          const matchSession =
            where.sessionId === undefined || row.sessionId === where.sessionId;
          if (matchCil && matchSession) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      },
      findMany: async ({
        where,
        take,
      }: {
        where: { sessionId?: string | null; cilIncidentId?: string | null };
        take?: number;
      }) => {
        const out: { id: string }[] = [];
        for (const row of rcis.values()) {
          const matchSession =
            where.sessionId === undefined || row.sessionId === where.sessionId;
          const matchCil =
            where.cilIncidentId === undefined || row.cilIncidentId === where.cilIncidentId;
          if (matchSession && matchCil) out.push({ id: row.id });
          if (take && out.length >= take) break;
        }
        return out;
      },
    },
    cilIncident: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        cils.has(where.id) ? { ...cils.get(where.id)! } : null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<CilRow> }) => {
        const row = cils.get(where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
      findMany: async ({
        where,
        take,
      }: {
        where: { sessionId?: string | null };
        take?: number;
      }) => {
        const out: { id: string }[] = [];
        for (const row of cils.values()) {
          if (where.sessionId === undefined || row.sessionId === where.sessionId) {
            out.push({ id: row.id });
          }
          if (take && out.length >= take) break;
        }
        return out;
      },
    },
    _rcis: rcis,
    _cils: cils,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tx as any;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("reconcileTriangle", () => {
  it("1. Session sur un RCI seul → pose RCI.sessionId, rien d'autre", async () => {
    const tx = makeTx({ rcis: [{ id: "r1", sessionId: null, cilIncidentId: null }] });
    await reconcileTriangle(tx, { rciId: "r1", sessionId: "s1" });
    expect(tx._rcis.get("r1")).toEqual({ id: "r1", sessionId: "s1", cilIncidentId: null });
  });

  it("2. Session sur un RCI déjà lié à un Livret → propage la session au Livret", async () => {
    const tx = makeTx({
      rcis: [{ id: "r1", sessionId: null, cilIncidentId: "c1" }],
      cils: [{ id: "c1", sessionId: null }],
    });
    await reconcileTriangle(tx, { rciId: "r1", sessionId: "s1" });
    expect(tx._rcis.get("r1").sessionId).toBe("s1");
    expect(tx._cils.get("c1").sessionId).toBe("s1");
  });

  it("3. Session sur un Livret déjà lié à un RCI → propage la session au RCI", async () => {
    const tx = makeTx({
      rcis: [{ id: "r1", sessionId: null, cilIncidentId: "c1" }],
      cils: [{ id: "c1", sessionId: null }],
    });
    await reconcileTriangle(tx, { cilId: "c1", sessionId: "s1" });
    expect(tx._cils.get("c1").sessionId).toBe("s1");
    expect(tx._rcis.get("r1").sessionId).toBe("s1");
  });

  it("4. RCI créé depuis un Livret qui a une session → le RCI hérite session + Livret", async () => {
    const tx = makeTx({
      rcis: [{ id: "r1", sessionId: null, cilIncidentId: "c1" }],
      cils: [{ id: "c1", sessionId: "s1" }],
    });
    // Anchor typique du POST /api/rci depuis un Livret : on ne passe que le Livret.
    await reconcileTriangle(tx, { rciId: "r1", cilId: "c1" });
    expect(tx._rcis.get("r1").cilIncidentId).toBe("c1");
    expect(tx._rcis.get("r1").sessionId).toBe("s1");
  });

  it("5. Refus : RCI déjà lié à une AUTRE session → conflit, aucun changement", async () => {
    const tx = makeTx({ rcis: [{ id: "r1", sessionId: "sX", cilIncidentId: null }] });
    await expect(
      reconcileTriangle(tx, { rciId: "r1", sessionId: "s1" }),
    ).rejects.toBeInstanceOf(TriangleConflictError);
    expect(tx._rcis.get("r1").sessionId).toBe("sX");
  });

  it("6. Refus : RCI déjà lié à un AUTRE Livret → conflit", async () => {
    const tx = makeTx({
      rcis: [{ id: "r1", sessionId: null, cilIncidentId: "cX" }],
      cils: [
        { id: "cX", sessionId: null },
        { id: "c1", sessionId: null },
      ],
    });
    await expect(
      reconcileTriangle(tx, { rciId: "r1", cilId: "c1" }),
    ).rejects.toBeInstanceOf(TriangleConflictError);
    expect(tx._rcis.get("r1").cilIncidentId).toBe("cX");
  });

  it("7. Refus : sessions divergentes RCI vs Livret → conflit", async () => {
    const tx = makeTx({
      rcis: [{ id: "r1", sessionId: "sA", cilIncidentId: "c1" }],
      cils: [{ id: "c1", sessionId: "sB" }],
    });
    await expect(
      reconcileTriangle(tx, { rciId: "r1" }),
    ).rejects.toBeInstanceOf(TriangleConflictError);
  });

  it("8. Déduction non ambiguë : Livret + session à un seul RCI orphelin → relie le RCI", async () => {
    const tx = makeTx({
      rcis: [{ id: "r1", sessionId: "s1", cilIncidentId: null }],
      cils: [{ id: "c1", sessionId: null }],
    });
    // Livret créé depuis la session s1 (qui a déjà le RCI orphelin r1).
    await reconcileTriangle(tx, { cilId: "c1", sessionId: "s1" });
    expect(tx._cils.get("c1").sessionId).toBe("s1");
    expect(tx._rcis.get("r1").cilIncidentId).toBe("c1");
  });

  it("9. Ambiguïté : deux RCI orphelins sur la session → aucun rattachement Livret↔RCI", async () => {
    const tx = makeTx({
      rcis: [
        { id: "r1", sessionId: "s1", cilIncidentId: null },
        { id: "r2", sessionId: "s1", cilIncidentId: null },
      ],
      cils: [{ id: "c1", sessionId: null }],
    });
    await reconcileTriangle(tx, { cilId: "c1", sessionId: "s1" });
    expect(tx._cils.get("c1").sessionId).toBe("s1");
    expect(tx._rcis.get("r1").cilIncidentId).toBeNull();
    expect(tx._rcis.get("r2").cilIncidentId).toBeNull();
  });
});
