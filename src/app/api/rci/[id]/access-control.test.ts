/**
 * Accès direct par identifiant — RCI.
 *
 * Contrairement aux autres tests de routes du bundle, celui-ci n'exécute PAS
 * de mock de `@/lib/auth` : il fait tourner l'implémentation réelle du
 * cloisonnement par `authorId`, en ne simulant que la session et Prisma.
 * Objectif : prouver qu'un utilisateur ne peut pas atteindre le dossier d'un
 * autre en devinant son identifiant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
const del = vi.fn();

vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rci: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      update: (...a: unknown[]) => update(...a),
      delete: (...a: unknown[]) => del(...a),
    },
  },
}));

import { GET, PATCH, DELETE } from "./route";

const ctx = { params: Promise.resolve({ id: "rci-de-bob" }) };

/** Dossier appartenant à Bob (u2), au même teamId technique qu'Alice. */
const rciDeBob = {
  id: "rci-de-bob",
  teamId: "default-team",
  authorId: "u2",
  status: "DRAFT",
  title: "Dossier confidentiel de Bob",
  dossierNumber: null,
  eventAt: null,
  payload: "{}",
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: "u2", nom: "Martin", prenom: "Bob" },
};

function connecte(role: "USER" | "EDITOR" | "ADMIN", id = "u1") {
  getCurrentUser.mockResolvedValue({
    id,
    username: "alice",
    nom: "Durand",
    prenom: "Alice",
    role,
  });
}

beforeEach(() => {
  getCurrentUser.mockReset();
  findUnique.mockReset();
  update.mockReset();
  del.mockReset();
  findUnique.mockResolvedValue(rciDeBob);
  update.mockResolvedValue({ ...rciDeBob, title: "modifié" });
  del.mockResolvedValue(rciDeBob);
});

function patchReq(body: unknown) {
  return new Request("http://localhost/api/rci/rci-de-bob", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/rci/[id] — lecture directe par identifiant", () => {
  it("USER ne peut pas lire le dossier d'un autre → 403", async () => {
    connecte("USER");
    const res = await GET(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(403);
  });

  it("EDITOR ne peut pas lire le dossier d'un autre → 403", async () => {
    connecte("EDITOR");
    const res = await GET(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(403);
  });

  it("le corps de la réponse refusée ne divulgue aucune donnée du dossier", async () => {
    connecte("USER");
    const res = await GET(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    const texte = await res.text();
    expect(texte).not.toContain("confidentiel");
    expect(texte).not.toContain("Bob");
  });

  it("ADMIN peut lire n'importe quel dossier → 200", async () => {
    connecte("ADMIN");
    const res = await GET(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(200);
  });

  it("l'auteur lit bien son propre dossier → 200", async () => {
    connecte("USER", "u2"); // u2 = Bob, propriétaire
    const res = await GET(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(200);
  });

  it("401 si non authentifié (la Response levée est bien interceptée)", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/rci/[id] — écriture directe par identifiant", () => {
  it("USER ne peut pas modifier le dossier d'un autre → 403, aucun update émis", async () => {
    connecte("USER");
    const res = await PATCH(patchReq({ title: "pirate" }), ctx);
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("EDITOR ne peut pas modifier le dossier d'un autre → 403", async () => {
    connecte("EDITOR");
    const res = await PATCH(patchReq({ title: "pirate" }), ctx);
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("l'auteur modifie bien son propre dossier → 200", async () => {
    connecte("USER", "u2");
    const res = await PATCH(patchReq({ title: "ok" }), ctx);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });
});

describe("DELETE /api/rci/[id] — suppression directe par identifiant", () => {
  it("USER ne peut pas supprimer le dossier d'un autre → 403, aucun delete émis", async () => {
    connecte("USER");
    const res = await DELETE(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("EDITOR ne peut pas supprimer le dossier d'un autre → 403", async () => {
    connecte("EDITOR");
    const res = await DELETE(new Request("http://localhost/api/rci/rci-de-bob"), ctx);
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });
});
