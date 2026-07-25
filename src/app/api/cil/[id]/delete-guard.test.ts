/**
 * Gardes de la route DELETE /api/cil/[id] (suppression physique, admin-only).
 * Court-circuits AVANT toute écriture Prisma : auth, autorité admin, exigence du
 * `stateToken`. La logique de suppression est couverte par
 * src/lib/triangle/__tests__/delete.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const $transaction = vi.fn();

vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cilIncident: { findUnique: vi.fn() },
    $transaction: (...a: unknown[]) => $transaction(...a),
  },
}));

import { DELETE } from "./route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

function req(body?: unknown) {
  return new Request("http://localhost/api/cil/c1", {
    method: "DELETE",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function connecte(role: "USER" | "EDITOR" | "ADMIN") {
  getCurrentUser.mockResolvedValue({
    id: "u1",
    username: "a",
    nom: "D",
    prenom: "A",
    role,
  });
}

beforeEach(() => {
  getCurrentUser.mockReset();
  $transaction.mockReset();
});

describe("DELETE /api/cil/[id] — gardes", () => {
  it("401 si non authentifié", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(401);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("403 pour un USER (non-admin)", async () => {
    connecte("USER");
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("403 pour un EDITOR (non-admin)", async () => {
    connecte("EDITOR");
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("400 pour un ADMIN sans stateToken", async () => {
    connecte("ADMIN");
    const res = await DELETE(req({}), ctx);
    expect(res.status).toBe(400);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("ADMIN avec stateToken déclenche la transaction", async () => {
    connecte("ADMIN");
    $transaction.mockResolvedValue({ deletable: true });
    const res = await DELETE(req({ stateToken: "t" }), ctx);
    expect(res.status).toBe(200);
    expect($transaction).toHaveBeenCalledOnce();
  });
});
