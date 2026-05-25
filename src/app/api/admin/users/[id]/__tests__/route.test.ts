/**
 * Tests unitaires — route DELETE/PUT /api/admin/users/[id]
 *
 * Couverture :
 *   1. DELETE non-existant → 404
 *   2. DELETE déjà inactif → 409
 *   3. DELETE auto-désactivation → 409
 *   4. DELETE dernier admin actif → 409
 *   5. DELETE user avec session(s) active(s) → 409 + activeSessions dans le body
 *   6. DELETE cas nominal → 200 + actif=false (soft, pas de prisma.user.delete)
 *   7. PUT actif=false + dernier admin → 409
 *   8. PUT role: USER sur soi-même (admin courant) → 409 (perte d'admin)
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────
//
// `getCurrentUser` lit les cookies via next/headers : on le mocke directement.
// `prisma` est mocké pour pouvoir contrôler les retours par scénario.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      count:      vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(), // on vérifie qu'il N'est JAMAIS appelé
    },
    ficheSession: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock bcrypt pour éviter l'init paresseuse + hash inutile dans les tests PUT
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));

// Imports après les mocks
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { DELETE, PUT } from "../route";

// Helpers typés vers les mocks
const m = prisma as unknown as {
  user: {
    findUnique: MockInstance;
    findFirst:  MockInstance;
    count:      MockInstance;
    update:     MockInstance;
    delete:     MockInstance;
  };
  ficheSession: { count: MockInstance };
};
const mockGetCurrentUser = getCurrentUser as unknown as MockInstance;

function buildParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function buildPutRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne 404 si l'utilisateur n'existe pas", async () => {
    m.user.findUnique.mockResolvedValue(null);

    const res = await DELETE({} as NextRequest, buildParams("inconnu"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/introuvable/i);
    expect(m.user.update).not.toHaveBeenCalled();
    expect(m.user.delete).not.toHaveBeenCalled();
  });

  it("retourne 409 si le compte est déjà inactif", async () => {
    m.user.findUnique.mockResolvedValue({ id: "u1", role: "USER", actif: false });

    const res = await DELETE({} as NextRequest, buildParams("u1"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/déjà désactivé/i);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("retourne 409 pour une auto-désactivation", async () => {
    m.user.findUnique.mockResolvedValue({ id: "u-me", role: "USER", actif: true });
    mockGetCurrentUser.mockResolvedValue({ id: "u-me", role: "USER" });

    const res = await DELETE({} as NextRequest, buildParams("u-me"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/propre compte/i);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("retourne 409 si c'est le dernier ADMIN actif", async () => {
    m.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN", actif: true });
    mockGetCurrentUser.mockResolvedValue({ id: "other-admin", role: "ADMIN" });
    // count des autres admins actifs = 0
    m.user.count.mockResolvedValue(0);

    const res = await DELETE({} as NextRequest, buildParams("admin-1"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/dernier administrateur/i);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("retourne 409 si l'utilisateur a des sessions de fiche actives", async () => {
    m.user.findUnique.mockResolvedValue({ id: "u1", role: "USER", actif: true });
    mockGetCurrentUser.mockResolvedValue({ id: "admin", role: "ADMIN" });
    m.ficheSession.count.mockResolvedValue(3);

    const res = await DELETE({} as NextRequest, buildParams("u1"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/session/i);
    expect(body.activeSessions).toBe(3);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("désactive logiquement (actif=false) — pas de prisma.user.delete", async () => {
    m.user.findUnique.mockResolvedValue({ id: "u1", role: "USER", actif: true });
    mockGetCurrentUser.mockResolvedValue({ id: "admin", role: "ADMIN" });
    m.ficheSession.count.mockResolvedValue(0);
    m.user.count.mockResolvedValue(5); // pas le dernier admin (non pertinent ici)
    m.user.update.mockResolvedValue({ id: "u1", actif: false });

    const res = await DELETE({} as NextRequest, buildParams("u1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, deactivated: true });

    // Vérification critique : update avec actif=false, JAMAIS delete
    expect(m.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data:  { actif: false },
    });
    expect(m.user.delete).not.toHaveBeenCalled();
  });

  it("désactive un admin si plusieurs admins actifs restent", async () => {
    m.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN", actif: true });
    mockGetCurrentUser.mockResolvedValue({ id: "admin-courant", role: "ADMIN" });
    // 2 autres admins actifs en plus d'admin-1
    m.user.count.mockResolvedValue(2);
    m.ficheSession.count.mockResolvedValue(0);
    m.user.update.mockResolvedValue({ id: "admin-1", actif: false });

    const res = await DELETE({} as NextRequest, buildParams("admin-1"));

    expect(res.status).toBe(200);
    expect(m.user.update).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data:  { actif: false },
    });
  });
});

// ─── PUT — checks de cohérence ───────────────────────────────────────────────

describe("PUT /api/admin/users/[id] — protections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne 409 si on passe actif=false sur le dernier admin actif", async () => {
    m.user.findUnique.mockResolvedValue({ id: "admin-seul", role: "ADMIN", actif: true, status: "approved" });
    mockGetCurrentUser.mockResolvedValue({ id: "other", role: "ADMIN" });
    m.user.count.mockResolvedValue(0); // aucun autre admin actif

    const res = await PUT(buildPutRequest({ actif: false }), buildParams("admin-seul"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/dernier administrateur/i);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("retourne 409 si on retire son propre rôle ADMIN", async () => {
    m.user.findUnique.mockResolvedValue({ id: "me", role: "ADMIN", actif: true, status: "approved" });
    mockGetCurrentUser.mockResolvedValue({ id: "me", role: "ADMIN" });

    const res = await PUT(buildPutRequest({ role: "USER" }), buildParams("me"));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/propre rôle/i);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("accepte une rétrogradation d'ADMIN s'il reste d'autres admins actifs", async () => {
    m.user.findUnique.mockResolvedValue({ id: "admin-ex", role: "ADMIN", actif: true, status: "approved" });
    mockGetCurrentUser.mockResolvedValue({ id: "admin-courant", role: "ADMIN" });
    m.user.count.mockResolvedValue(1); // 1 autre admin actif
    m.user.update.mockResolvedValue({ id: "admin-ex", role: "USER" });

    const res = await PUT(buildPutRequest({ role: "USER" }), buildParams("admin-ex"));

    expect(res.status).toBe(200);
    expect(m.user.update).toHaveBeenCalled();
  });
});
