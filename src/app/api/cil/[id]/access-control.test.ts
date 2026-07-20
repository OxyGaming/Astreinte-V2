/**
 * Accès direct par identifiant — ressources filles du CIL.
 *
 * Les dépêches, événements, intervenants, autorisations et signatures ne
 * portent pas d'auteur : leur cloisonnement passe par l'`authorId` de leur
 * `CilIncident` parent. Ce test exécute le vrai `assertTeamAccess` (seules la
 * session et Prisma sont simulées) pour vérifier qu'écrire dans l'incident
 * d'un autre utilisateur est refusé.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const findUniqueIncident = vi.fn();
const createIntervenant = vi.fn();

vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cilIncident: { findUnique: (...a: unknown[]) => findUniqueIncident(...a) },
    cilIntervenant: { create: (...a: unknown[]) => createIntervenant(...a) },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        cilIntervenant: { create: (...a: unknown[]) => createIntervenant(...a) },
        cilEvent: {
          // `nextSeq` (src/lib/cil/repo.ts) lit le dernier `seq` via findFirst.
          findFirst: async () => null,
          create: async () => ({ id: "evt1" }),
        },
      }),
  },
}));

import { POST } from "./intervenants/route";

const ctx = { params: Promise.resolve({ id: "inc-de-bob" }) };

/** Incident ouvert appartenant à Bob (u2). */
const incidentDeBob = {
  id: "inc-de-bob",
  teamId: "default-team",
  authorId: "u2",
  status: "OPEN",
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

function req(body: unknown) {
  return new Request("http://localhost/api/cil/inc-de-bob/intervenants", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  getCurrentUser.mockReset();
  findUniqueIncident.mockReset();
  createIntervenant.mockReset();
  findUniqueIncident.mockResolvedValue(incidentDeBob);
  createIntervenant.mockResolvedValue({ id: "int1" });
});

const intervenantValide = { type: "COS", arrivedAt: "2026-07-16T12:00:00.000Z" };

describe("POST /api/cil/[id]/intervenants — cloisonnement via l'incident parent", () => {
  it("USER ne peut pas écrire dans l'incident d'un autre → 403, aucune création", async () => {
    connecte("USER");
    const res = await POST(req(intervenantValide), ctx);
    expect(res.status).toBe(403);
    expect(createIntervenant).not.toHaveBeenCalled();
  });

  it("EDITOR ne peut pas écrire dans l'incident d'un autre → 403", async () => {
    connecte("EDITOR");
    const res = await POST(req(intervenantValide), ctx);
    expect(res.status).toBe(403);
    expect(createIntervenant).not.toHaveBeenCalled();
  });

  it("le refus intervient avant toute validation métier du corps", async () => {
    // Un corps invalide sur un incident d'autrui doit sortir en 403, pas en
    // 400 : le contrôle d'accès précède l'analyse du contenu.
    connecte("USER");
    const res = await POST(req({ type: "TYPE_INEXISTANT" }), ctx);
    expect(res.status).toBe(403);
  });

  it("l'auteur de l'incident peut y ajouter un intervenant", async () => {
    connecte("USER", "u2");
    const res = await POST(req(intervenantValide), ctx);
    expect(res.status).not.toBe(403);
  });

  it("ADMIN peut écrire dans n'importe quel incident", async () => {
    connecte("ADMIN");
    const res = await POST(req(intervenantValide), ctx);
    expect(res.status).not.toBe(403);
  });
});
