/**
 * Test d'intégration — rattachement « + Session » hors ligne, de bout en bout :
 *   création locale (op `session-create` en file) → synchronisation (promotion
 *   de la session côté serveur) → rattachement effectif du RCI / Livret.
 *
 * L'anomalie d'origine : le mode offline créait la session mais NE rejouait
 * jamais le rattachement. On rejoue ici la logique du drain (promotion POST puis
 * `patchSessionLink`) contre un backend en mémoire qui exécute le VRAI
 * `reconcileTriangle`, et on vérifie l'état final des FK.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { patchSessionLink } from "@/lib/session-link";
import { reconcileTriangle } from "@/lib/triangle";

// ─── Backend en mémoire (partagé entre requêtes) ──────────────────────────────

type RciRow = { id: string; sessionId: string | null; cilIncidentId: string | null; status: string };
type CilRow = { id: string; sessionId: string | null };

function makeBackend(seed: { rcis?: RciRow[]; cils?: CilRow[] }) {
  const rcis = new Map<string, RciRow>((seed.rcis ?? []).map((r) => [r.id, { ...r }]));
  const cils = new Map<string, CilRow>((seed.cils ?? []).map((c) => [c.id, { ...c }]));
  let sessionSeq = 0;

  // tx en mémoire couvrant les requêtes de reconcileTriangle.
  const tx = {
    rci: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        rcis.has(where.id) ? { ...rcis.get(where.id)! } : null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<RciRow> }) => {
        Object.assign(rcis.get(where.id)!, data);
        return { ...rcis.get(where.id)! };
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
          const mc = where.cilIncidentId === undefined || row.cilIncidentId === where.cilIncidentId;
          const ms = where.sessionId === undefined || row.sessionId === where.sessionId;
          if (mc && ms) { Object.assign(row, data); count++; }
        }
        return { count };
      },
      findMany: async ({ where, take }: { where: { sessionId?: string | null; cilIncidentId?: string | null }; take?: number }) => {
        const out: { id: string }[] = [];
        for (const row of rcis.values()) {
          const ms = where.sessionId === undefined || row.sessionId === where.sessionId;
          const mc = where.cilIncidentId === undefined || row.cilIncidentId === where.cilIncidentId;
          if (ms && mc) out.push({ id: row.id });
          if (take && out.length >= take) break;
        }
        return out;
      },
    },
    cilIncident: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        cils.has(where.id) ? { ...cils.get(where.id)! } : null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<CilRow> }) => {
        Object.assign(cils.get(where.id)!, data);
        return { ...cils.get(where.id)! };
      },
      findMany: async ({ where, take }: { where: { sessionId?: string | null }; take?: number }) => {
        const out: { id: string }[] = [];
        for (const row of cils.values()) {
          if (where.sessionId === undefined || row.sessionId === where.sessionId) out.push({ id: row.id });
          if (take && out.length >= take) break;
        }
        return out;
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTx = tx as any;

  // Mock fetch : simule les routes touchées par le drain offline.
  async function fetchImpl(url: string, init: RequestInit): Promise<Response> {
    const body = init.body ? JSON.parse(init.body as string) : {};
    // 1) Promotion de la session locale.
    if (url === "/api/sessions" && init.method === "POST") {
      const id = `srv-session-${++sessionSeq}`;
      return new Response(JSON.stringify({ session: { id } }), { status: 201 });
    }
    // 2) Rattachement RCI → session (+ fermeture du triangle).
    const rciMatch = url.match(/^\/api\/rci\/(.+)$/);
    if (rciMatch && init.method === "PATCH") {
      const row = rcis.get(rciMatch[1]);
      if (!row) return new Response(JSON.stringify({ error: "RCI inconnu" }), { status: 404 });
      if (row.status === "FINAL")
        return new Response(JSON.stringify({ error: "RCI finalisé, lecture seule." }), { status: 409 });
      row.sessionId = body.sessionId;
      await reconcileTriangle(anyTx, { rciId: row.id, sessionId: body.sessionId });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    // 3) Rattachement Livret → session (action link-session).
    const cilMatch = url.match(/^\/api\/cil\/(.+)$/);
    if (cilMatch && init.method === "PATCH" && body.action === "link-session") {
      const row = cils.get(cilMatch[1]);
      if (!row) return new Response(JSON.stringify({ error: "Incident inconnu" }), { status: 404 });
      row.sessionId = body.sessionId;
      await reconcileTriangle(anyTx, { cilId: row.id, sessionId: body.sessionId });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }

  return { rcis, cils, fetchImpl };
}

/**
 * Rejoue le cœur du drain (FicheSessionView) pour une op `session-create` :
 * promotion serveur puis rattachement via le code de production partagé.
 */
async function drainSessionCreate(op: {
  ficheSlug: string;
  payload: { ficheTitre: string; linkRci?: string | null; linkCil?: string | null };
}) {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ficheSlug: op.ficheSlug, ficheTitre: op.payload.ficheTitre }),
  });
  const { session } = await res.json();
  const link = await patchSessionLink(op.payload.linkRci, op.payload.linkCil, session.id);
  return { sessionId: session.id as string, link };
}

afterEach(() => vi.restoreAllMocks());

describe("drain hors ligne → rattachement effectif", () => {
  it("session locale liée à un RCI seul : après synchro, RCI.sessionId est posé", async () => {
    const be = makeBackend({ rcis: [{ id: "r1", sessionId: null, cilIncidentId: null, status: "DRAFT" }] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn(be.fetchImpl as any);

    const { sessionId, link } = await drainSessionCreate({
      ficheSlug: "franchissement-signal",
      payload: { ficheTitre: "Franchissement signal", linkRci: "r1" },
    });

    expect(link).toEqual({ ok: true, label: "Session rattachée au RCI" });
    expect(be.rcis.get("r1")!.sessionId).toBe(sessionId);
  });

  it("RCI déjà lié à un Livret : la session synchronisée se propage AUSSI au Livret", async () => {
    const be = makeBackend({
      rcis: [{ id: "r1", sessionId: null, cilIncidentId: "c1", status: "DRAFT" }],
      cils: [{ id: "c1", sessionId: null }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn(be.fetchImpl as any);

    const { sessionId } = await drainSessionCreate({
      ficheSlug: "f",
      payload: { ficheTitre: "F", linkRci: "r1" },
    });

    expect(be.rcis.get("r1")!.sessionId).toBe(sessionId);
    expect(be.cils.get("c1")!.sessionId).toBe(sessionId); // fermeture du triangle
  });

  it("session locale liée à un Livret : après synchro, CIL.sessionId est posé", async () => {
    const be = makeBackend({ cils: [{ id: "c1", sessionId: null }] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn(be.fetchImpl as any);

    const { sessionId, link } = await drainSessionCreate({
      ficheSlug: "f",
      payload: { ficheTitre: "F", linkCil: "c1" },
    });

    expect(link).toEqual({ ok: true, label: "Session rattachée au Livret CIL" });
    expect(be.cils.get("c1")!.sessionId).toBe(sessionId);
  });

  it("RCI finalisé : la synchro ne ment pas — échec remonté, aucun rattachement", async () => {
    const be = makeBackend({ rcis: [{ id: "r1", sessionId: null, cilIncidentId: null, status: "FINAL" }] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn(be.fetchImpl as any);

    const { link } = await drainSessionCreate({
      ficheSlug: "f",
      payload: { ficheTitre: "F", linkRci: "r1" },
    });

    expect(link).toEqual({ ok: false, error: "RCI finalisé, lecture seule." });
    expect(be.rcis.get("r1")!.sessionId).toBeNull();
  });

  it("ressource disparue pendant l'attente : échec 404 propre, pas de faux succès", async () => {
    const be = makeBackend({ rcis: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn(be.fetchImpl as any);

    const { link } = await drainSessionCreate({
      ficheSlug: "f",
      payload: { ficheTitre: "F", linkRci: "r-supprimé" },
    });

    expect(link).toEqual({ ok: false, error: "RCI inconnu" });
  });
});
