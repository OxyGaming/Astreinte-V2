import { describe, expect, it } from "vitest";
import { parseBlocs, parseCoordonnees, parseSeuils, validerEtape } from "../parse";
import { parseTexte } from "../texte";

describe("parseTexte", () => {
  it("puces, sous-puces et gras", () => {
    const l = parseTexte("Intro\n- un **deux**\n-- sous\n\n• trois");
    expect(l.map((x) => (x.kind === "li" ? `li${x.level}` : "p"))).toEqual(["p", "li1", "li2", "li1"]);
    expect(l[1].segments).toEqual([{ text: "un ", bold: false }, { text: "deux", bold: true }]);
  });
});
import { itineraireUrls, navigationUrl } from "../navigation";

describe("validerEtape", () => {
  it("normalise une étape obligatoire", () => {
    const r = validerEtape({ titre: " Point A ", type: "POINT", dureeMin: "30", trajetSuivanteMin: 10, latitude: "45,46", longitude: 4.76 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.titre).toBe("Point A");
    expect(r.value.dureeMin).toBe(30);
    expect(r.value.latitude).toBe(45.46);
    expect(r.value.surcoutTrajetMin).toBeNull();
  });

  it("une optionnelle n'a ni heure imposée ni trajet de chaîne", () => {
    const r = validerEtape({ titre: "Opt", optionnelle: true, heureImposee: "10:00", trajetSuivanteMin: 12, surcoutTrajetMin: 8 });
    expect(r.ok && r.value.heureImposee).toBe(null);
    expect(r.ok && r.value.trajetSuivanteMin).toBe(0);
    expect(r.ok && r.value.surcoutTrajetMin).toBe(8);
  });

  it("rejette titre vide, heure invalide, GPS incomplet, URL dangereuse", () => {
    expect(validerEtape({ titre: "" }).ok).toBe(false);
    expect(validerEtape({ titre: "x", heureImposee: "25:00" }).ok).toBe(false);
    expect(validerEtape({ titre: "x", latitude: 45 }).ok).toBe(false);
    expect(validerEtape({ titre: "x", latitude: 95, longitude: 4 }).ok).toBe(false);
    expect(validerEtape({ titre: "x", liens: [{ libelle: "a", url: "javascript:alert(1)" }] }).ok).toBe(false);
  });
});

describe("parseCoordonnees", () => {
  it("accepte texte brut, virgule décimale et URL Google Maps", () => {
    expect(parseCoordonnees("45.604513, 4.792673")).toEqual({ latitude: 45.604513, longitude: 4.792673 });
    expect(parseCoordonnees("45,604513 4,792673")).toEqual({ latitude: 45.604513, longitude: 4.792673 });
    expect(parseCoordonnees("https://www.google.com/maps/@45.5850,4.7663,17z")).toEqual({ latitude: 45.585, longitude: 4.7663 });
    expect(parseCoordonnees("https://maps.google.com/?q=45.46177,4.76958")).toEqual({ latitude: 45.46177, longitude: 4.76958 });
    expect(parseCoordonnees("n'importe quoi")).toBeNull();
  });
});

describe("lectures tolérantes", () => {
  it("JSON corrompu → valeurs par défaut", () => {
    expect(parseBlocs("{oops")).toEqual([]);
    expect(parseSeuils(null)).toEqual({ toleranceMin: 2, rougeMin: 15, margeConfortMin: 5 });
  });

  it("filtre les blocs vides et les lieux invalides", () => {
    const b = parseBlocs(JSON.stringify([{ type: "ATTENTION", texte: "x", lieu: { latitude: 200, longitude: 1 } }, { texte: "  " }]));
    expect(b).toHaveLength(1);
    expect(b[0].lieu).toBeNull();
  });
});

describe("navigation", () => {
  it("lien de navigation et découpage de l'itinéraire complet", () => {
    expect(navigationUrl(45.1, 4.2)).toContain("destination=45.1,4.2");
    const pts = Array.from({ length: 15 }, (_, i) => ({ lat: 45 + i / 100, lng: 4 }));
    const urls = itineraireUrls(pts);
    expect(urls).toHaveLength(2);
    expect(itineraireUrls(pts.slice(0, 1))).toEqual([]);
  });
});
