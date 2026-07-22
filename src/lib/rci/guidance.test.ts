import { describe, expect, it } from "vitest";
import { emptyPayload, type RciPayload } from "./fields";
import {
  MATRIX_CODE_LENGTH,
  RCI_EVENT_TYPES,
  RCI_FIELD_GROUPS,
  isGroupFilled,
  missingByStep,
  missingRequired,
  normalizeEventType,
  etapeDeLaCle,
  requirementFor,
  requirementOf,
} from "./guidance";

const groupById = (id: string) => {
  const g = RCI_FIELD_GROUPS.find((x) => x.id === id);
  if (!g) throw new Error(`groupe ${id} introuvable`);
  return g;
};

describe("intégrité de la grille", () => {
  it("n'a pas d'identifiant en double", () => {
    const ids = RCI_FIELD_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("code sur 6 colonnes, uniquement R/C/N", () => {
    for (const g of RCI_FIELD_GROUPS) {
      expect(g.code, g.id).toMatch(
        new RegExp(`^[RCN]{${MATRIX_CODE_LENGTH}}$`),
      );
    }
  });

  it("ne référence que des clés existantes du payload", () => {
    const known = new Set(Object.keys(emptyPayload()));
    for (const g of RCI_FIELD_GROUPS) {
      for (const k of g.keys) expect(known, `${g.id}.${k}`).toContain(k);
    }
  });

  it("couvre chaque étape du wizard", () => {
    const steps = new Set(RCI_FIELD_GROUPS.map((g) => g.step));
    expect([...steps].sort()).toEqual([
      "acteurs",
      "installations",
      "mobiles",
      "nature",
      "ou",
      "presents",
      "quand",
      "qui",
      "recit",
    ]);
  });
});

describe("requirementFor", () => {
  it("restitue la ligne « PK » du tableau d'analyse", () => {
    const pk = groupById("pk");
    expect(requirementFor(pk, "collision_pn")).toBe("required");
    expect(requirementFor(pk, "accident_personne")).toBe("required");
    expect(requirementFor(pk, "franchissement")).toBe("na");
    expect(requirementFor(pk, "deraillement_manoeuvre")).toBe("required");
    expect(requirementFor(pk, "deraillement_ligne")).toBe("required");
    expect(requirementFor(pk, "erreur_direction")).toBe("na");
  });

  it("restitue la ligne « besoin de relevage » (déraillements uniquement)", () => {
    const relevage = groupById("relevage");
    expect(requirementFor(relevage, "deraillement_manoeuvre")).toBe("required");
    expect(requirementFor(relevage, "deraillement_ligne")).toBe("required");
    expect(requirementFor(relevage, "collision_pn")).toBe("na");
    expect(requirementFor(relevage, "erreur_direction")).toBe("na");
  });

  it("marque le PN sans objet hors heurt au PN", () => {
    const pn = groupById("pn");
    expect(requirementFor(pn, "collision_pn")).toBe("required");
    for (const t of RCI_EVENT_TYPES) {
      if (t === "collision_pn" || t === "autre") continue;
      expect(requirementFor(pn, t), t).toBe("na");
    }
  });

  it("sur « autre », garde le niveau commun et retombe sinon sur conditionnel", () => {
    // Universellement requis → reste requis.
    expect(requirementFor(groupById("dossier"), "autre")).toBe("required");
    // Universellement sans objet → reste sans objet.
    expect(requirementFor(groupById("autres_gi"), "autre")).toBe("na");
    // Variable selon la situation → on n'impose ni ne masque.
    expect(requirementFor(groupById("pk"), "autre")).toBe("conditional");
  });

  it("requirementOf tolère un identifiant inconnu", () => {
    expect(requirementOf("groupe-fantome", "collision_pn")).toBe("conditional");
  });
});

describe("etapeDeLaCle", () => {
  it("renvoie l'étape réelle de saisie, y compris hors grille", () => {
    // Ces trois clés n'appartiennent à aucun groupe d'exigence : sans
    // rattachement explicite, elles retombaient sur « recit » et le panneau de
    // reprise envoyait l'agent vérifier la date à la dernière étape.
    expect(etapeDeLaCle("jour_semaine")).toBe("quand");
    expect(etapeDeLaCle("event_type")).toBe("nature");
    expect(etapeDeLaCle("numero_voie")).toBe("ou");
  });

  it("suit la grille quand le champ y figure", () => {
    expect(etapeDeLaCle("point_km")).toBe("ou");
    expect(etapeDeLaCle("veh_besoin_relevage")).toBe("mobiles");
    expect(etapeDeLaCle("ef1_nom")).toBe("qui");
  });

  it("range chaque clé du payload dans une étape plausible", () => {
    // Garde-fou : aucun champ ne doit atterrir dans « recit » par défaut s'il
    // appartient visiblement à un autre bloc du RCI.
    const attendus: Record<string, string> = {
      inst_kvb: "installations",
      pn_numero: "installations",
      train_numero: "mobiles",
      cab_rst: "mobiles",
      qui_sgc: "qui",
      alcool_positif: "acteurs",
      mc_l2_heure: "acteurs",
      po_suge_present: "presents",
    };
    for (const [cle, etape] of Object.entries(attendus)) {
      expect(etapeDeLaCle(cle as keyof RciPayload), cle).toBe(etape);
    }
  });
});

describe("rubriques hors grille d'analyse", () => {
  // Le contexte de conduite et l'emplacement libre « autre équipement » figurent
  // dans le formulaire officiel, mais la grille des 7 RCI de référence ne permet
  // ni de les rendre obligatoires ni de les rattacher à un type d'événement.
  // Décision : « selon le cas » partout — toujours visibles, jamais réclamés.
  const HORS_GRILLE = ["contexte_conduite", "autre_equipement"];

  it("sont « selon le cas » dans toutes les situations", () => {
    for (const id of HORS_GRILLE) {
      for (const t of RCI_EVENT_TYPES) {
        expect(requirementOf(id, t), `${id} / ${t}`).toBe("conditional");
      }
    }
  });

  it("ne sont jamais repliés comme « sans objet »", () => {
    // `na` déclencherait le repli derrière « Afficher quand même » : ces
    // rubriques doivent rester directement accessibles.
    for (const id of HORS_GRILLE) {
      for (const t of RCI_EVENT_TYPES) {
        expect(requirementOf(id, t)).not.toBe("na");
      }
    }
  });

  it("ne sont jamais comptés comme champs obligatoires manquants", () => {
    for (const t of RCI_EVENT_TYPES) {
      const ids = missingRequired(emptyPayload(), {}, t).map((g) => g.group.id);
      for (const id of HORS_GRILLE) expect(ids, `${id} / ${t}`).not.toContain(id);
    }
  });

  it("n'alourdissent aucune pastille d'étape", () => {
    const parEtape = missingByStep(emptyPayload(), {}, "deraillement_ligne");
    const total = missingRequired(emptyPayload(), {}, "deraillement_ligne").length;
    expect(Object.values(parEtape).reduce((a, b) => a + b, 0)).toBe(total);
  });
});

describe("complétude", () => {
  it("mode any : une seule clé suffit", () => {
    const p = emptyPayload();
    const g = groupById("pn");
    expect(isGroupFilled(g, p)).toBe(false);
    p.pn_numero = "337";
    expect(isGroupFilled(g, p)).toBe(true);
  });

  it("mode all : toutes les clés sont exigées", () => {
    const p = emptyPayload();
    const g = groupById("datetime");
    p.date_evenement = "08/01/2026";
    expect(isGroupFilled(g, p)).toBe(false);
    p.heure_evenement = "7h30";
    expect(isGroupFilled(g, p)).toBe(true);
  });

  it("un ternaire répondu « non » compte comme renseigné", () => {
    const p = emptyPayload();
    const g = groupById("relevage");
    expect(isGroupFilled(g, p)).toBe(false);
    p.veh_besoin_relevage = false;
    expect(isGroupFilled(g, p)).toBe(true);
  });

  it("une case décochée ne compte pas — c'est l'état par défaut", () => {
    const p = emptyPayload();
    expect(isGroupFilled(groupById("autres_gi"), p)).toBe(false);
    p.autres_gi_delegataire = true;
    expect(isGroupFilled(groupById("autres_gi"), p)).toBe(true);
  });

  it("le schéma succinct se lit dans les photos", () => {
    const p = emptyPayload();
    const g = groupById("schema");
    expect(isGroupFilled(g, p, {})).toBe(false);
    expect(isGroupFilled(g, p, { schema_succinct: "iVBOR" })).toBe(true);
  });
});

describe("récapitulatif des manques", () => {
  function filled(): RciPayload {
    // Remplit toute clé texte/ternaire citée par la grille : plus aucun manque.
    const p = emptyPayload();
    for (const g of RCI_FIELD_GROUPS) {
      for (const k of g.keys) {
        const v = p[k];
        if (typeof v === "string") (p[k] as string) = "x";
        else (p[k] as boolean) = true;
      }
    }
    return p;
  }

  it("ne signale rien quand tout est renseigné", () => {
    expect(
      missingRequired(filled(), { schema_succinct: "x" }, "deraillement_ligne"),
    ).toEqual([]);
  });

  it("ne signale que les groupes obligatoires vides", () => {
    const gaps = missingRequired(emptyPayload(), {}, "collision_pn");
    const ids = gaps.map((g) => g.group.id);
    expect(ids).toContain("dossier");
    expect(ids).toContain("pn");
    // Sans objet pour un heurt au PN → jamais réclamé.
    expect(ids).not.toContain("relevage");
    expect(ids).not.toContain("vehicules");
    expect(ids).not.toContain("autres_gi");
  });

  it("réclame le relevage sur un déraillement en manœuvre", () => {
    const ids = missingRequired(
      emptyPayload(),
      {},
      "deraillement_manoeuvre",
    ).map((g) => g.group.id);
    expect(ids).toContain("relevage");
    expect(ids).toContain("vehicules");
    expect(ids).not.toContain("pn");
  });

  it("suit l'ordre du RCI papier", () => {
    const gaps = missingRequired(emptyPayload(), {}, "accident_personne");
    const order = RCI_FIELD_GROUPS.map((g) => g.id);
    const idx = gaps.map((g) => order.indexOf(g.group.id));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it("ventile les manques par étape", () => {
    const byStep = missingByStep(emptyPayload(), {}, "collision_pn");
    expect(byStep.quand).toBe(2); // n° de dossier + date/heure
    expect(byStep.nature).toBe(1);
    expect(
      Object.values(byStep).reduce((a, b) => a + b, 0),
    ).toBe(missingRequired(emptyPayload(), {}, "collision_pn").length);
  });
});

describe("normalizeEventType", () => {
  it("accepte les types connus", () => {
    expect(normalizeEventType("franchissement")).toBe("franchissement");
  });
  it("retombe sur « autre » pour une valeur inconnue ou absente", () => {
    expect(normalizeEventType("")).toBe("autre");
    expect(normalizeEventType(undefined)).toBe("autre");
    expect(normalizeEventType("collision_avion")).toBe("autre");
  });
});
