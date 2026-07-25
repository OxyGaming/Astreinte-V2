/**
 * Règles de suppression du triangle Session ↔ RCI ↔ Livret CIL.
 *
 * Teste le domaine (`analyzeDeletion` / `executeDeletion`) sur un faux client de
 * transaction en mémoire. Couvre : gardes probantes (RCI FINAL / Livret CLOSED),
 * gravité WARNING/DANGER, catégories de données détruites, jeton d'obsolescence
 * (intégration de la STRUCTURE des liens, pas seulement des dates), et
 * l'atomicité audit ↔ suppression.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  analyzeDeletion,
  executeDeletion,
  ProbativeBlockError,
  StaleStateError,
  TriangleEntityNotFoundError,
  type TriangleEntityKind,
} from "@/lib/triangle";
import type { Tx } from "@/lib/triangle";

// ─── Faux client de transaction en mémoire ────────────────────────────────────

type RciRow = {
  id: string;
  title: string | null;
  dossierNumber: string | null;
  status: string;
  updatedAt: Date;
  sessionId: string | null;
  cilIncidentId: string | null;
};
type CilRow = {
  id: string;
  reference: string | null;
  lieu: string;
  status: string;
  updatedAt: Date;
  sessionId: string | null;
};
type SessionRow = { id: string; ficheTitre: string; status: string; endedAt: Date | null };

type Store = {
  rcis: RciRow[];
  cils: CilRow[];
  sessions: SessionRow[];
  // Présence de données filles (par id parent) → catégories détruites en cascade.
  actionLogs: Set<string>;
  commentLogs: Set<string>;
  cilEvents: Set<string>;
  cilDepeches: Set<string>;
  cilIntervenants: Set<string>;
  cilAutorisations: Set<string>;
  cilSignatures: Set<string>;
  deleted: string[];
  audits: Array<Record<string, unknown>>;
};

function emptyStore(): Store {
  return {
    rcis: [],
    cils: [],
    sessions: [],
    actionLogs: new Set(),
    commentLogs: new Set(),
    cilEvents: new Set(),
    cilDepeches: new Set(),
    cilIntervenants: new Set(),
    cilAutorisations: new Set(),
    cilSignatures: new Set(),
    deleted: [],
    audits: [],
  };
}

function presence(set: Set<string>, id: string) {
  return set.has(id) ? { id } : null;
}

function makeTx(store: Store): Tx {
  const firstBy = <T extends { id: string }>(rows: T[], where: Record<string, unknown>) =>
    rows.find((r) =>
      Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
    ) ?? null;
  const manyBy = <T>(rows: T[], where: Record<string, unknown>) =>
    rows.filter((r) =>
      Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
    );

  const tx = {
    rci: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        firstBy(store.rcis, where),
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        manyBy(store.rcis, where),
      delete: async ({ where }: { where: { id: string } }) => {
        store.deleted.push(`rci:${where.id}`);
        store.rcis = store.rcis.filter((r) => r.id !== where.id);
        return {};
      },
    },
    cilIncident: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        firstBy(store.cils, where),
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        manyBy(store.cils, where),
      delete: async ({ where }: { where: { id: string } }) => {
        store.deleted.push(`cil:${where.id}`);
        store.cils = store.cils.filter((c) => c.id !== where.id);
        return {};
      },
    },
    ficheSession: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        firstBy(store.sessions, where),
      delete: async ({ where }: { where: { id: string } }) => {
        store.deleted.push(`session:${where.id}`);
        store.sessions = store.sessions.filter((s) => s.id !== where.id);
        return {};
      },
    },
    ficheActionLog: {
      findFirst: async ({ where }: { where: { sessionId: string } }) =>
        presence(store.actionLogs, where.sessionId),
    },
    ficheCommentLog: {
      findFirst: async ({ where }: { where: { sessionId: string } }) =>
        presence(store.commentLogs, where.sessionId),
    },
    cilEvent: {
      findFirst: async ({ where }: { where: { incidentId: string } }) =>
        presence(store.cilEvents, where.incidentId),
    },
    cilDepeche: {
      findFirst: async ({ where }: { where: { incidentId: string } }) =>
        presence(store.cilDepeches, where.incidentId),
    },
    cilIntervenant: {
      findFirst: async ({ where }: { where: { incidentId: string } }) =>
        presence(store.cilIntervenants, where.incidentId),
    },
    cilAutorisation: {
      findFirst: async ({ where }: { where: { incidentId: string } }) =>
        presence(store.cilAutorisations, where.incidentId),
    },
    cilSignature: {
      findFirst: async ({ where }: { where: { incidentId: string } }) =>
        presence(store.cilSignatures, where.incidentId),
    },
    adminAuditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.audits.push(data);
        return data;
      },
    },
  };
  return tx as unknown as Tx;
}

const D = new Date("2026-07-01T10:00:00.000Z");
const actor = { id: "admin-1", nom: "Admin System" };

function rci(p: Partial<RciRow> & { id: string }): RciRow {
  return {
    title: "RCI test",
    dossierNumber: null,
    status: "DRAFT",
    updatedAt: D,
    sessionId: null,
    cilIncidentId: null,
    ...p,
  };
}
function cil(p: Partial<CilRow> & { id: string }): CilRow {
  return {
    reference: null,
    lieu: "PK 12",
    status: "OPEN",
    updatedAt: D,
    sessionId: null,
    ...p,
  };
}
function session(p: Partial<SessionRow> & { id: string }): SessionRow {
  return { ficheTitre: "Session test", status: "active", endedAt: null, ...p };
}

// Aperçu via le domaine, en tolérant un impact non nul.
async function preview(store: Store, kind: TriangleEntityKind, id: string) {
  const impact = await analyzeDeletion(makeTx(store), kind, id);
  if (!impact) throw new Error("impact null");
  return impact;
}

let store: Store;
beforeEach(() => {
  store = emptyStore();
});

// ─── RCI ──────────────────────────────────────────────────────────────────────

describe("Suppression RCI", () => {
  it("brouillon isolé : supprimable, WARNING, aucune donnée détruite", async () => {
    store.rcis.push(rci({ id: "r1" }));
    const i = await preview(store, "rci", "r1");
    expect(i.deletable).toBe(true);
    expect(i.severity).toBe("WARNING");
    expect(i.destroyedData).toEqual([]);
    expect(i.blockers).toEqual([]);
  });

  it("FINAL : bloqué par SELF_FINAL", async () => {
    store.rcis.push(rci({ id: "r1", status: "FINAL" }));
    const i = await preview(store, "rci", "r1");
    expect(i.deletable).toBe(false);
    expect(i.blockers[0].reason).toBe("SELF_FINAL");
  });

  it("lié à un Livret CLOSED : reste supprimable (le Livret n'est pas altéré)", async () => {
    store.cils.push(cil({ id: "c1", status: "CLOSED" }));
    store.rcis.push(rci({ id: "r1", cilIncidentId: "c1" }));
    const i = await preview(store, "rci", "r1");
    expect(i.deletable).toBe(true);
    expect(i.severedLinks.map((l) => l.neighborId)).toContain("c1");
  });
});

// ─── Livret CIL ─────────────────────────────────────────────────────────────

describe("Suppression Livret CIL", () => {
  it("OPEN avec enfants : DANGER + catégories détruites", async () => {
    store.cils.push(cil({ id: "c1" }));
    store.cilEvents.add("c1");
    store.cilDepeches.add("c1");
    const i = await preview(store, "cil", "c1");
    expect(i.deletable).toBe(true);
    expect(i.severity).toBe("DANGER");
    expect(i.destroyedData).toEqual(["Événements", "Dépêches"]);
  });

  it("CLOSED : bloqué par SELF_CLOSED", async () => {
    store.cils.push(cil({ id: "c1", status: "CLOSED" }));
    const i = await preview(store, "cil", "c1");
    expect(i.deletable).toBe(false);
    expect(i.blockers[0].reason).toBe("SELF_CLOSED");
  });

  it("OPEN mais lié à un RCI FINAL : bloqué par RCI_FINAL", async () => {
    store.cils.push(cil({ id: "c1" }));
    store.rcis.push(rci({ id: "r1", status: "FINAL", cilIncidentId: "c1" }));
    const i = await preview(store, "cil", "c1");
    expect(i.deletable).toBe(false);
    expect(i.blockers.some((b) => b.reason === "RCI_FINAL" && b.element.id === "r1")).toBe(true);
  });
});

// ─── Session ──────────────────────────────────────────────────────────────────

describe("Suppression Session", () => {
  it("avec journal : DANGER + catégories", async () => {
    store.sessions.push(session({ id: "s1" }));
    store.actionLogs.add("s1");
    store.commentLogs.add("s1");
    const i = await preview(store, "session", "s1");
    expect(i.severity).toBe("DANGER");
    expect(i.destroyedData).toEqual(["Journal d'actions", "Commentaires de session"]);
  });

  it("archivée sans voisin : supprimable", async () => {
    store.sessions.push(session({ id: "s1", status: "archived", endedAt: D }));
    const i = await preview(store, "session", "s1");
    expect(i.deletable).toBe(true);
  });

  it("liée à un RCI FINAL (direct) : bloquée", async () => {
    store.sessions.push(session({ id: "s1" }));
    store.rcis.push(rci({ id: "r1", status: "FINAL", sessionId: "s1" }));
    const i = await preview(store, "session", "s1");
    expect(i.deletable).toBe(false);
    expect(i.blockers.some((b) => b.reason === "RCI_FINAL")).toBe(true);
  });

  it("liée à un Livret CLOSED (direct) : bloquée", async () => {
    store.sessions.push(session({ id: "s1" }));
    store.cils.push(cil({ id: "c1", status: "CLOSED", sessionId: "s1" }));
    const i = await preview(store, "session", "s1");
    expect(i.deletable).toBe(false);
    expect(i.blockers.some((b) => b.reason === "CIL_CLOSED")).toBe(true);
  });
});

// ─── Jeton d'obsolescence ─────────────────────────────────────────────────────

describe("stateToken", () => {
  it("intègre la STRUCTURE des liens : un rattachement RCI↔Livret change le jeton, sans modif d'updatedAt", async () => {
    store.sessions.push(session({ id: "s1" }));
    store.rcis.push(rci({ id: "r1", sessionId: "s1", cilIncidentId: null }));
    store.cils.push(cil({ id: "c1", sessionId: "s1" }));

    const before = (await preview(store, "session", "s1")).stateToken;

    // On ajoute l'arête r1→c1 SANS toucher aux updatedAt ni aux statuts.
    store.rcis[0].cilIncidentId = "c1";
    const after = (await preview(store, "session", "s1")).stateToken;

    expect(after).not.toBe(before);
  });

  it("déterministe : même état ⇒ même jeton", async () => {
    store.sessions.push(session({ id: "s1" }));
    store.rcis.push(rci({ id: "r1", sessionId: "s1" }));
    const a = (await preview(store, "session", "s1")).stateToken;
    const b = (await preview(store, "session", "s1")).stateToken;
    expect(a).toBe(b);
  });
});

// ─── executeDeletion : atomicité & gardes ─────────────────────────────────────

describe("executeDeletion", () => {
  it("succès : supprime ET écrit l'audit, avec le motif", async () => {
    store.rcis.push(rci({ id: "r1" }));
    const tx = makeTx(store);
    const token = (await analyzeDeletion(tx, "rci", "r1"))!.stateToken;
    await executeDeletion(tx, "rci", "r1", actor, token, "doublon");
    expect(store.deleted).toContain("rci:r1");
    expect(store.audits).toHaveLength(1);
    expect(store.audits[0].resource).toBe("triangle-rci");
    const detail = JSON.parse(store.audits[0].detail as string);
    expect(detail.motif).toBe("doublon");
    expect(detail.performedBy.userId).toBe("admin-1");
  });

  it("jeton obsolète ⇒ StaleStateError, aucune suppression ni audit", async () => {
    store.rcis.push(rci({ id: "r1" }));
    const tx = makeTx(store);
    await expect(
      executeDeletion(tx, "rci", "r1", actor, "jeton-perime"),
    ).rejects.toBeInstanceOf(StaleStateError);
    expect(store.deleted).toEqual([]);
    expect(store.audits).toEqual([]);
  });

  it("élément probant ⇒ ProbativeBlockError, aucune suppression ni audit", async () => {
    store.cils.push(cil({ id: "c1" }));
    store.rcis.push(rci({ id: "r1", status: "FINAL", cilIncidentId: "c1" }));
    const tx = makeTx(store);
    const token = (await analyzeDeletion(tx, "cil", "c1"))!.stateToken;
    await expect(
      executeDeletion(tx, "cil", "c1", actor, token),
    ).rejects.toBeInstanceOf(ProbativeBlockError);
    expect(store.deleted).toEqual([]);
    expect(store.audits).toEqual([]);
  });

  it("ressource absente ⇒ TriangleEntityNotFoundError", async () => {
    const tx = makeTx(store);
    await expect(
      executeDeletion(tx, "rci", "inexistant", actor, "x"),
    ).rejects.toBeInstanceOf(TriangleEntityNotFoundError);
  });
});
