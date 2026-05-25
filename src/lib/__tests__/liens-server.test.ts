/**
 * Tests unitaires — helpers d'import/export des liens.
 *
 * Couverture :
 *   - normalizeLiensPayloadSync : validation contre un Set d'IDs connus
 *   - parseLiensImportField : null si absent (pas d'écrasement), erreur si JSON
 *     malformé, JSON normalisé si OK
 *   - serializeLiensForExport : "" si vide, JSON sinon — pas de "[]" parasite
 *   - Roundtrip : export → import conserve fidèlement la donnée
 */

import { describe, it, expect } from "vitest";
import {
  normalizeLiensPayloadSync,
  parseLiensImportField,
  serializeLiensForExport,
} from "../liens-server";

describe("normalizeLiensPayloadSync", () => {
  it("accepte un lien de collection référencé par un lienId connu", () => {
    const known = new Set(["lien-1", "lien-2"]);
    const result = normalizeLiensPayloadSync([{ lienId: "lien-1" }], known);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.json)).toEqual([{ lienId: "lien-1" }]);
      expect(result.count).toBe(1);
    }
  });

  it("rejette un lienId inconnu de la collection", () => {
    const known = new Set(["lien-1"]);
    const result = normalizeLiensPayloadSync([{ lienId: "lien-introuvable" }], known);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("lien-introuvable");
      expect(result.error).toContain("introuvable");
    }
  });

  it("accepte un lien libre avec libelle + URL http(s)", () => {
    const result = normalizeLiensPayloadSync(
      [{ libelle: "Intranet", url: "https://intranet.sncf/" }],
      new Set(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.json)).toEqual([
        { libelle: "Intranet", url: "https://intranet.sncf/" },
      ]);
    }
  });

  it("rejette un lien libre dont l'URL n'est pas http(s)", () => {
    const result = normalizeLiensPayloadSync(
      [{ libelle: "Mauvais", url: "javascript:alert(1)" }],
      new Set(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("URL invalide");
  });

  it("rejette un lien libre sans libellé", () => {
    const result = normalizeLiensPayloadSync(
      [{ url: "https://exemple.fr/" }],
      new Set(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("libellé");
  });

  it("rejette une entrée qui n'est pas un tableau", () => {
    const result = normalizeLiensPayloadSync({ lienId: "x" }, new Set());

    expect(result.ok).toBe(false);
  });

  it("tolère un tableau vide", () => {
    const result = normalizeLiensPayloadSync([], new Set());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.json)).toEqual([]);
      expect(result.count).toBe(0);
    }
  });
});

describe("parseLiensImportField — pas d'écrasement sur colonne absente", () => {
  it("retourne value=null pour `undefined` (colonne absente du fichier)", () => {
    const result = parseLiensImportField(undefined, new Set());

    expect(result.value).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it("retourne value=null pour la chaîne vide (cellule vide dans Excel)", () => {
    const result = parseLiensImportField("", new Set());

    expect(result.value).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it("retourne value=null pour une chaîne whitespace-only", () => {
    const result = parseLiensImportField("   \n  ", new Set());

    expect(result.value).toBeNull();
  });

  it("retourne value=\"[]\" pour un tableau vide explicite (effacement intentionnel)", () => {
    const result = parseLiensImportField("[]", new Set());

    expect(result.value).toBe("[]");
    expect(result.error).toBeUndefined();
  });

  it("normalise un JSON valide et retourne la chaîne propre", () => {
    const known = new Set(["lien-A"]);
    const result = parseLiensImportField(
      '[{"lienId":"lien-A","libelle":"Surcharge"}]',
      known,
    );

    expect(result.error).toBeUndefined();
    expect(result.value).toBeTruthy();
    expect(JSON.parse(result.value!)).toEqual([
      { lienId: "lien-A", libelle: "Surcharge" },
    ]);
    expect(result.count).toBe(1);
  });

  it("retourne une erreur pour un JSON malformé sans écraser (value=null)", () => {
    const result = parseLiensImportField("{not json", new Set());

    expect(result.value).toBeNull();
    expect(result.error).toContain("malformé");
  });

  it("retourne une erreur pour un lienId inconnu sans écraser (value=null)", () => {
    const result = parseLiensImportField(
      '[{"lienId":"absent"}]',
      new Set(["autre"]),
    );

    expect(result.value).toBeNull();
    expect(result.error).toContain("absent");
  });
});

describe("serializeLiensForExport", () => {
  it("retourne la chaîne vide pour null/undefined (pas de cellule \"[]\" parasite)", () => {
    expect(serializeLiensForExport(null)).toBe("");
    expect(serializeLiensForExport(undefined)).toBe("");
  });

  it("retourne la chaîne vide pour un tableau vide", () => {
    expect(serializeLiensForExport("[]")).toBe("");
  });

  it("sérialise un tableau de LienRef non vide", () => {
    const input = JSON.stringify([{ lienId: "lien-1" }, { libelle: "X", url: "https://x.fr/" }]);
    const output = serializeLiensForExport(input);

    expect(output).not.toBe("");
    const parsed = JSON.parse(output);
    expect(parsed).toEqual([
      { lienId: "lien-1" },
      { libelle: "X", url: "https://x.fr/" },
    ]);
  });

  it("tolère un JSON malformé en entrée (renvoie chaîne vide)", () => {
    expect(serializeLiensForExport("{broken")).toBe("");
  });
});

describe("Roundtrip export → import (conservation fidèle des liens)", () => {
  it("conserve un mélange de liens de collection et de liens libres", () => {
    const known = new Set(["ref-1", "ref-2"]);
    const original = [
      { lienId: "ref-1" },
      { lienId: "ref-2", libelle: "Libellé surchargé" },
      { libelle: "PDF interne", url: "https://docs.sncf/manuel.pdf" },
    ];

    // Étape 1 : on simule l'export — la DB stocke déjà du JSON
    const exported = serializeLiensForExport(JSON.stringify(original));
    expect(exported).not.toBe("");

    // Étape 2 : on simule l'import — le champ du fichier est traité
    const reimported = parseLiensImportField(exported, known);
    expect(reimported.error).toBeUndefined();
    expect(reimported.value).toBeTruthy();

    // Étape 3 : la valeur réimportée doit être équivalente à l'originale
    const parsed = JSON.parse(reimported.value!);
    expect(parsed).toEqual(original);
  });

  it("conserve la donnée existante quand la colonne est absente du fichier", () => {
    // Simule l'absence de la colonne `liens_json` dans le fichier importé.
    // Côté route : `liensValue = parsed.value ?? existing.liens`
    const parsed = parseLiensImportField(undefined, new Set());
    const existing = JSON.stringify([{ lienId: "preserved" }]);
    const finalValue = parsed.value ?? existing;

    expect(finalValue).toBe(existing);
  });
});
