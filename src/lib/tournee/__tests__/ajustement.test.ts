import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { appliquerEtapes } from "../ajustement";
import type { TourneePlan } from "../types";

const plan: TourneePlan = {
  modeleId: "m",
  version: 1,
  titre: "T",
  aPropos: [],
  heureDepart: "08:00",
  seuils: { toleranceMin: 2, rougeMin: 15, margeConfortMin: 5 },
  contacts: [],
  liens: [],
  etapes: [
    { key: "a", type: "DEPART", titre: "Départ", optionnelle: false, dureeMin: 0, trajetSuivanteMin: 10, localisationMasquee: false, liens: [{ libelle: "R", url: "https://x.org" }], contenu: [], photos: [{ id: "p1" }] },
    { key: "b", type: "POINT", titre: "B", optionnelle: false, dureeMin: 20, trajetSuivanteMin: 5, localisationMasquee: false, liens: [], contenu: [], photos: [] },
  ],
};

describe("appliquerEtapes (ajustement référent)", () => {
  it("réordonne, modifie les temps et conserve contenu / photos / liens", () => {
    const out = appliquerEtapes(plan, [{ key: "b", dureeMin: 25 }, { key: "a" }]);
    expect(out.map((e) => e.key)).toEqual(["b", "a"]);
    expect(out[0].dureeMin).toBe(25);
    expect(out[1].photos).toEqual([{ id: "p1" }]);
    expect(out[1].liens).toHaveLength(1);
  });

  it("retire une étape absente de la liste et ajoute une étape libre", () => {
    const out = appliquerEtapes(plan, [{ key: "a" }, { titre: "Nouveau point", dureeMin: 15, latitude: 45, longitude: 4 }]);
    expect(out).toHaveLength(2);
    expect(out[1].key).toMatch(/^local-/);
    expect(out[1].latitude).toBe(45);
  });

  it("peut rendre une étape optionnelle mais garde au moins une obligatoire", () => {
    expect(appliquerEtapes(plan, [{ key: "a" }, { key: "b", optionnelle: true }])[1].optionnelle).toBe(true);
    expect(() => appliquerEtapes(plan, [{ key: "a", optionnelle: true }])).toThrow();
    expect(() => appliquerEtapes(plan, [{ key: "a" }, { key: "a" }])).toThrow(/doublon/);
  });
});
