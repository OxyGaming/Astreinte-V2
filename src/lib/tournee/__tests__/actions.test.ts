import { describe, expect, it } from "vitest";
import { demarrerEtape, demarrerTournee, positionEtape, terminerEtape } from "../actions";
import { calculerProgression } from "../planning";
import type { TourneeEvent, TourneePlanEtape } from "../types";

const e = (key: string, p: Partial<TourneePlanEtape> = {}): TourneePlanEtape => ({
  key, type: "POINT", titre: key, optionnelle: false, dureeMin: 10, trajetSuivanteMin: 5,
  localisationMasquee: false, liens: [], contenu: [], photos: [], ...p,
});
const ETAPES = [e("D", { type: "DEPART", dureeMin: 0 }), e("A"), e("O", { optionnelle: true }), e("F", { type: "RESTITUTION", dureeMin: 0 })];

const rejouer = (specs: { type: TourneeEvent["type"]; etapeKey?: string | null }[]) =>
  calculerProgression(ETAPES, specs.map((s, i) => ({ type: s.type, etapeKey: s.etapeKey ?? null, at: 1000 + i })));

describe("actions terrain", () => {
  it("démarrer la tournée valide le passage au départ (durée nulle)", () => {
    const specs = demarrerTournee(ETAPES, rejouer([]));
    expect(specs.map((s) => s.type)).toEqual(["TOURNEE_DEBUT", "ETAPE_DEBUT", "ETAPE_FIN"]);
    const p = rejouer(specs);
    expect(p.etats.get("D")!.statut).toBe("terminee");
    expect(p.prochaineKey).toBe("A");
  });

  it("terminer la dernière obligatoire clôt la tournée", () => {
    const base = [...demarrerTournee(ETAPES, rejouer([])), { type: "ETAPE_DEBUT" as const, etapeKey: "A" }];
    expect(terminerEtape(ETAPES, rejouer(base), "A").map((s) => s.type)).toEqual(["ETAPE_FIN"]);
    const avantF = [...base, ...terminerEtape(ETAPES, rejouer(base), "A")];
    const fin = demarrerEtape(ETAPES, rejouer(avantF), "F");
    expect(fin.map((s) => s.type)).toEqual(["ETAPE_DEBUT", "ETAPE_FIN", "TOURNEE_FIN"]);
    expect(rejouer([...avantF, ...fin]).termine).toBe(true);
  });

  it("position parmi les obligatoires", () => {
    expect(positionEtape(ETAPES, "A")).toEqual({ x: 2, n: 3 });
    expect(positionEtape(ETAPES, "O")).toBeNull();
  });
});
