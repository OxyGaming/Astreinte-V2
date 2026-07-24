/**
 * Tests unitaires — titre par défaut du RCI (proposition à la création) et règle
 * auto/personnalisé.
 *
 * Couvre la demande :
 *   - génération depuis une Session ;
 *   - génération depuis un Livret (type + lieu + date) ;
 *   - absence de lieu ;
 *   - type libre ;
 *   - conservation d'un titre manuel ;
 *   - Nature vide qui ne supprime pas le titre ;
 *   - évolution du titre auto tant qu'il n'est pas personnalisé ;
 *   - repli « RCI à compléter » plutôt que « Sans titre ».
 */
import { describe, it, expect } from "vitest";
import {
  defaultTitleFromSession,
  defaultTitleFromCil,
  autoTitleUpdate,
  TITRE_A_COMPLETER,
} from "@/lib/rci/title";

// Midi UTC : la date locale reste le 20/07/2026 quel que soit le fuseau du CI.
const OCCURRED = "2026-07-20T12:00:00.000Z";
const DATE_FR = "20/07/2026";

describe("defaultTitleFromSession", () => {
  it("titre de la fiche / procédure + date de session", () => {
    expect(defaultTitleFromSession("Franchissement signal", OCCURRED)).toBe(
      `Franchissement signal — ${DATE_FR}`,
    );
  });
  it("sans date → titre seul (pas de séparateur orphelin)", () => {
    expect(defaultTitleFromSession("Franchissement signal")).toBe("Franchissement signal");
    expect(defaultTitleFromSession("Franchissement signal", null)).toBe("Franchissement signal");
  });
  it("trim les espaces superflus", () => {
    expect(defaultTitleFromSession("  Dirigeant d'enquête  ")).toBe("Dirigeant d'enquête");
  });
  it("repli si titre vide/nul (jamais une date seule)", () => {
    expect(defaultTitleFromSession("", OCCURRED)).toBe(TITRE_A_COMPLETER);
    expect(defaultTitleFromSession(null, OCCURRED)).toBe(TITRE_A_COMPLETER);
    expect(defaultTitleFromSession("   ")).toBe(TITRE_A_COMPLETER);
  });
});

describe("defaultTitleFromCil", () => {
  it("type (libellé) + lieu + date", () => {
    expect(
      defaultTitleFromCil({ type: "OBSTACLE", typeLibre: null, lieu: "Givors-Canal", occurredAt: OCCURRED }),
    ).toBe(`Obstacle — Givors-Canal — ${DATE_FR}`);
  });

  it("type libre prioritaire sur le libellé", () => {
    expect(
      defaultTitleFromCil({ type: "AUTRE", typeLibre: "Nid de frelons", lieu: "Peyraud", occurredAt: OCCURRED }),
    ).toBe(`Nid de frelons — Peyraud — ${DATE_FR}`);
  });

  it("absence de lieu → pas de séparateur orphelin", () => {
    expect(
      defaultTitleFromCil({ type: "INCENDIE", typeLibre: null, lieu: null, occurredAt: OCCURRED }),
    ).toBe(`Incendie — ${DATE_FR}`);
  });

  it("absence de lieu ET de date → type seul", () => {
    expect(
      defaultTitleFromCil({ type: "OBSTACLE", typeLibre: null, lieu: "  ", occurredAt: null }),
    ).toBe("Obstacle");
  });

  it("rien d'exploitable → repli", () => {
    expect(
      defaultTitleFromCil({ type: "", typeLibre: null, lieu: null, occurredAt: null }),
    ).toBe(TITRE_A_COMPLETER);
  });
});

describe("autoTitleUpdate", () => {
  it("titre auto + Nature renseignée → le titre suit la Nature", () => {
    expect(autoTitleUpdate(true, "Déraillement V2")).toEqual({ title: "Déraillement V2" });
  });

  it("titre auto + Nature vide → aucune écriture (jamais de null)", () => {
    expect(autoTitleUpdate(true, "")).toBeNull();
    expect(autoTitleUpdate(true, "   ")).toBeNull();
    expect(autoTitleUpdate(true, null)).toBeNull();
  });

  it("titre personnalisé → jamais remplacé, même si la Nature change", () => {
    expect(autoTitleUpdate(false, "Déraillement V2")).toBeNull();
    expect(autoTitleUpdate(false, "")).toBeNull();
  });
});
