/**
 * Tests unitaires — patchSessionLink.
 *
 * Garantit le correctif du « faux succès » : le rattachement ne renvoie `ok:true`
 * QUE si l'API a répondu 2xx. Un 409 (RCI finalisé / conflit de triangle) ou un
 * 404 (ressource disparue) doit remonter `ok:false` avec le message de l'API.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { patchSessionLink } from "@/lib/session-link";

function mockFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = vi.fn(impl as any);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("patchSessionLink", () => {
  it("ne fait rien si aucun lien n'est demandé", async () => {
    const spy = vi.fn();
    mockFetch(spy);
    const r = await patchSessionLink(null, null, "s1");
    expect(r).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("RCI : PATCH réussi → ok:true, cible /api/rci/:id avec sessionId", async () => {
    let seenUrl = "";
    let seenBody: unknown = null;
    mockFetch((url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ id: "r1" }), { status: 200 });
    });
    const r = await patchSessionLink("r1", null, "s1");
    expect(r).toEqual({ ok: true, label: "Session rattachée au RCI" });
    expect(seenUrl).toBe("/api/rci/r1");
    expect(seenBody).toEqual({ sessionId: "s1" });
  });

  it("Livret : PATCH réussi → action link-session vers /api/cil/:id", async () => {
    let seenUrl = "";
    let seenBody: unknown = null;
    mockFetch((url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({}), { status: 200 });
    });
    const r = await patchSessionLink(null, "c1", "s1");
    expect(r).toEqual({ ok: true, label: "Session rattachée au Livret CIL" });
    expect(seenUrl).toBe("/api/cil/c1");
    expect(seenBody).toEqual({ action: "link-session", sessionId: "s1" });
  });

  it("409 (RCI finalisé) → ok:false, PAS de faux succès, message de l'API remonté", async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ error: "RCI finalisé, lecture seule." }), {
        status: 409,
      }),
    );
    const r = await patchSessionLink("r1", null, "s1");
    expect(r).toEqual({ ok: false, error: "RCI finalisé, lecture seule." });
  });

  it("404 (ressource disparue) → ok:false avec repli si pas de message", async () => {
    mockFetch(() => new Response("nope", { status: 404 }));
    const r = await patchSessionLink(null, "c1", "s1");
    expect(r).toEqual({ ok: false, error: "Rattachement impossible" });
  });

  it("exception réseau → ok:false (réseau), jamais de succès", async () => {
    mockFetch(() => {
      throw new Error("offline");
    });
    const r = await patchSessionLink("r1", null, "s1");
    expect(r).toEqual({ ok: false, error: "Rattachement impossible (réseau)" });
  });
});
