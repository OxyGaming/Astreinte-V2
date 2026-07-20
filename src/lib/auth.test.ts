/**
 * Cloisonnement des modules RCI / CIL.
 *
 * L'application n'ayant pas de notion d'équipe, la frontière d'accès est
 * `authorId`. Ces tests portent sur l'implémentation réelle de `src/lib/auth.ts`
 * (pas sur un mock), pour verrouiller la règle :
 *   ADMIN → tout ; USER / EDITOR → uniquement leurs propres ressources.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/user-auth", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

import {
  assertTeamAccess,
  getSessionUser,
  requireUser,
  teamScope,
  type SessionUser,
} from "./auth";

function session(over: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u1",
    email: "jean.dupont",
    name: "Jean Dupont",
    role: "USER",
    teamId: "default-team",
    teamIds: ["default-team"],
    viewAllTeams: false,
    adminScopeMode: null,
    adminTeamId: null,
    ...over,
  };
}

/** Deux ressources au même `teamId` : seul `authorId` doit les distinguer. */
const mien = { teamId: "default-team", authorId: "u1" };
const autrui = { teamId: "default-team", authorId: "u2" };

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("assertTeamAccess — frontière d'accès = authorId", () => {
  it("USER accède à sa propre ressource", () => {
    expect(assertTeamAccess(session({ role: "USER" }), mien)).toBe(true);
  });

  it("USER n'accède PAS à la ressource d'un autre, même teamId identique", () => {
    expect(assertTeamAccess(session({ role: "USER" }), autrui)).toBe(false);
  });

  it("EDITOR n'a aucune visibilité élargie : refusé sur la ressource d'autrui", () => {
    expect(assertTeamAccess(session({ role: "EDITOR" }), autrui)).toBe(false);
  });

  it("EDITOR accède à ses propres ressources", () => {
    expect(assertTeamAccess(session({ role: "EDITOR" }), mien)).toBe(true);
  });

  it("ADMIN accède à toutes les ressources", () => {
    expect(assertTeamAccess(session({ role: "ADMIN" }), autrui)).toBe(true);
  });

  it("`viewAllTeams` ne confère aucun droit (champ inerte)", () => {
    const u = session({ role: "USER", viewAllTeams: true });
    expect(assertTeamAccess(u, autrui)).toBe(false);
  });

  it("un teamId différent ne bloque pas son propre dossier (teamId non sécuritaire)", () => {
    const u = session({ role: "USER" });
    expect(assertTeamAccess(u, { teamId: "autre-equipe", authorId: "u1" })).toBe(true);
  });
});

describe("teamScope — filtre de liste", () => {
  it("USER → restreint à ses propres dossiers", () => {
    expect(teamScope(session({ role: "USER" }))).toEqual({ authorId: "u1" });
  });

  it("EDITOR → restreint à ses propres dossiers", () => {
    expect(teamScope(session({ role: "EDITOR" }))).toEqual({ authorId: "u1" });
  });

  it("ADMIN → aucun filtre", () => {
    expect(teamScope(session({ role: "ADMIN" }))).toEqual({});
  });

  it("le résultat s'étale à la racine d'un where sans introduire d'OR", () => {
    // Garde-fou explicite contre le piège documenté : `{}` placé dans une
    // branche d'OR serait éliminé par Prisma et annulerait le cloisonnement.
    const where = { status: "DRAFT", ...teamScope(session({ role: "USER" })) };
    expect(where).toEqual({ status: "DRAFT", authorId: "u1" });
    expect(Object.keys(where)).not.toContain("OR");
  });
});

describe("requireUser — contrat de throw", () => {
  it("lève (et ne retourne pas) une Response 401 si non authentifié", async () => {
    getCurrentUser.mockResolvedValue(null);
    // Le throw est structurant : les routes font
    // `try { u = await requireUser() } catch (r) { return r as Response }`.
    // Un return transformerait tous les 401 en 500.
    await expect(requireUser()).rejects.toBeInstanceOf(Response);
    try {
      await requireUser();
      expect.unreachable("requireUser aurait dû lever");
    } catch (r) {
      expect((r as Response).status).toBe(401);
    }
  });

  it("retourne la session quand l'utilisateur est authentifié", async () => {
    getCurrentUser.mockResolvedValue({
      id: "u9",
      username: "jean.dupont",
      nom: "Dupont",
      prenom: "Jean",
      role: "EDITOR",
    });
    const u = await requireUser();
    expect(u.id).toBe("u9");
    expect(u.role).toBe("EDITOR");
    expect(u.name).toBe("Jean Dupont");
  });
});

describe("getSessionUser — projection vers la forme attendue par le bundle", () => {
  it("null si pas de session", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  it("compose `name` depuis prenom + nom", async () => {
    getCurrentUser.mockResolvedValue({
      id: "u1",
      username: "j.achille",
      nom: "Achille",
      prenom: "Jessie",
      role: "USER",
    });
    const u = await getSessionUser();
    expect(u?.name).toBe("Jessie Achille");
    expect(u?.viewAllTeams).toBe(false);
  });
});
