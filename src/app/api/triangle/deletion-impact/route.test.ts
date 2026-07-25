/**
 * Gardes de la route d'aperçu GET /api/triangle/deletion-impact (admin-only).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getCurrentUser = vi.fn();
const analyzeDeletion = vi.fn();

vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/triangle", () => ({
  analyzeDeletion: (...a: unknown[]) => analyzeDeletion(...a),
}));

import { GET } from "./route";

function req(qs: string) {
  return new NextRequest(`http://localhost/api/triangle/deletion-impact${qs}`);
}

beforeEach(() => {
  getCurrentUser.mockReset();
  analyzeDeletion.mockReset();
});

describe("GET /api/triangle/deletion-impact — gardes", () => {
  it("401 si non authentifié", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await GET(req("?type=rci&id=r1"));
    expect(res.status).toBe(401);
  });

  it("403 pour un non-admin", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "USER" });
    const res = await GET(req("?type=rci&id=r1"));
    expect(res.status).toBe(403);
    expect(analyzeDeletion).not.toHaveBeenCalled();
  });

  it("400 si type invalide", async () => {
    getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN" });
    const res = await GET(req("?type=poste&id=r1"));
    expect(res.status).toBe(400);
  });

  it("400 si id manquant", async () => {
    getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN" });
    const res = await GET(req("?type=rci"));
    expect(res.status).toBe(400);
  });

  it("404 si la ressource est introuvable", async () => {
    getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN" });
    analyzeDeletion.mockResolvedValue(null);
    const res = await GET(req("?type=rci&id=inconnu"));
    expect(res.status).toBe(404);
  });

  it("200 avec l'impact pour un admin", async () => {
    getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN" });
    analyzeDeletion.mockResolvedValue({ deletable: true, stateToken: "abc" });
    const res = await GET(req("?type=session&id=s1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stateToken).toBe("abc");
  });
});
