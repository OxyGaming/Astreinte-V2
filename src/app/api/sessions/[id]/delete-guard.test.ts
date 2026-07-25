/**
 * Gardes de la route DELETE /api/sessions/[id] (suppression physique, admin-only).
 * On ne teste ici que les court-circuits AVANT toute écriture Prisma : auth,
 * autorité admin, et exigence du `stateToken`. La logique de suppression du
 * triangle elle-même est couverte par src/lib/triangle/__tests__/delete.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getCurrentUser = vi.fn();
const $transaction = vi.fn();

vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
  canAccessSession: () => true,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (...a: unknown[]) => $transaction(...a) },
}));

vi.mock("@/lib/db", () => ({
  getSessionById: vi.fn(),
  archiveFicheSession: vi.fn(),
  getSessionJournal: vi.fn(),
}));

import { DELETE } from "./route";

const ctx = { params: Promise.resolve({ id: "s1" }) };

function req(body?: unknown) {
  return new NextRequest("http://localhost/api/sessions/s1", {
    method: "DELETE",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  getCurrentUser.mockReset();
  $transaction.mockReset();
});

describe("DELETE /api/sessions/[id] — gardes", () => {
  it("401 si non authentifié", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(401);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("403 pour un USER (non-admin)", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "USER", nom: "D", prenom: "A", username: "a" });
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("403 pour un EDITOR (non-admin)", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "EDITOR", nom: "D", prenom: "A", username: "a" });
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("400 pour un ADMIN sans stateToken", async () => {
    getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN", nom: "S", prenom: "Admin", username: "admin" });
    const res = await DELETE(req({}), ctx);
    expect(res.status).toBe(400);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("ADMIN avec stateToken déclenche la transaction", async () => {
    getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN", nom: "S", prenom: "Admin", username: "admin" });
    $transaction.mockResolvedValue({ deletable: true });
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(200);
    expect($transaction).toHaveBeenCalledOnce();
  });
});
