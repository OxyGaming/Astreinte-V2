import { describe, expect, it } from "vitest";
import { pdfText, renderTourneePdf } from "../pdf/TourneeDocument";
import { construirePlanTheorique } from "../planning";
import type { TourneePlan } from "../types";

describe("PDF — texte compatible police standard", () => {
  it("conserve le français et translittère le reste", () => {
    expect(pdfText("Œuvre « élevée » – 9h00 · ça")).toBe("Œuvre « élevée » – 9h00 · ça");
    expect(pdfText("A → B ⚠ −3 🚗")).toBe("A -> B ! -3 ");
  });
});

describe("PDF — rendu", () => {
  it("génère un document paginé à partir des données", async () => {
    const plan: TourneePlan = {
      modeleId: "m", version: 1, titre: "Tournée test", aPropos: [], heureDepart: "08:45",
      seuils: { toleranceMin: 2, rougeMin: 15, margeConfortMin: 5 },
      contacts: [{ fonction: "Responsable", nom: "Alex", telephone: "06 00 00 00 00" }], liens: [],
      etapes: [
        { key: "d", type: "DEPART", titre: "Départ", optionnelle: false, dureeMin: 0, trajetSuivanteMin: 15, latitude: 45.5, longitude: 4.8, localisationMasquee: false, liens: [], contenu: [], photos: [] },
        { key: "a", type: "POINT", titre: "Point A", optionnelle: false, dureeMin: 30, trajetSuivanteMin: 0, localisationMasquee: true, liens: [{ libelle: "Réf", url: "https://example.org" }], contenu: [{ id: "b", type: "ATTENTION", titre: "Attention", texte: "- un\n- deux" }], photos: [] },
      ],
    };
    const buf = await renderTourneePdf({ plan, theorique: construirePlanTheorique(plan.etapes, "2026-10-01", "08:45"), date: "2026-10-01", photos: new Map() });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(2000);
  }, 30_000);
});
