import { describe, expect, it } from "vitest";
import { emptyPayload } from "./fields";
import {
  accepter,
  correspondanceCil,
  correspondanceFiche,
  depuisCil,
  depuisSession,
  estDivergent,
  grouperPropositions,
  isoToDateFr,
  isoToHeureFr,
  isoToJourFr,
  libelleGares,
  ligneIntervenant,
  propositionsUtiles,
  type CilIncidentInput,
  type PropositionChamp,
} from "./reprise";


/** Aplatit les propositions en objet clé → valeur (lisibilité des tests). */
function plat(
  r: { propositions: PropositionChamp[] },
): Record<string, string | boolean | undefined> {
  return Object.fromEntries(r.propositions.map((p) => [p.cle, p.valeur]));
}

function incident(over: Partial<CilIncidentInput> = {}): CilIncidentInput {
  return {
    id: "c1",
    reference: "2207261435-Givors",
    type: "ACCIDENT_PERSONNE",
    typeLibre: null,
    occurredAt: "2026-07-22T14:35:00",
    lieu: "PN 337",
    poste: "GIV",
    voie: "2",
    voies: null,
    km: "532,572",
    observations: "Barrière endommagée",
    gareMode: "BETWEEN",
    gareUnique: null,
    gareA: "Givors",
    gareB: "St Romain",
    cilNom: "ACHILLE",
    cilPrenom: "Jessie",
    cilEtablissement: "EIC_RAL",
    arrivedOnSiteAt: "2026-07-22T15:10:00",
    ...over,
  };
}

describe("formats", () => {
  it("convertit un ISO vers les formats du payload", () => {
    expect(isoToDateFr("2026-07-22T14:35:00")).toBe("22/07/2026");
    expect(isoToHeureFr("2026-07-22T07:05:00")).toBe("7h05");
    expect(isoToJourFr("2026-07-22T14:35:00")).toBe("Mercredi");
  });

  it("ne produit rien sur une date invalide", () => {
    expect(isoToDateFr("pas une date")).toBe("");
    expect(isoToHeureFr("")).toBe("");
  });
});

describe("correspondances CIL → RCI", () => {
  it("ne déduit la typologie que lorsqu'elle est certaine", () => {
    expect(correspondanceCil("ACCIDENT_PERSONNE")).toEqual({
      genre: "certaine",
      typologie: "accident_personne",
    });
    // Le CIL ne distingue ni déraillement ni franchissement : pas de pari.
    expect(correspondanceCil("INCENDIE")).toEqual({ genre: "aucune" });
    expect(correspondanceCil("OBSTACLE")).toEqual({ genre: "aucune" });
  });

  it("mappe les intervenants sur les lignes du RCI", () => {
    expect(ligneIntervenant("OPJ")).toBe("police");
    expect(ligneIntervenant("COS")).toBe("pompiers");
    expect(ligneIntervenant("POMPES_FUNEBRES")).toBe("funebres");
    expect(ligneIntervenant("EXF_TRACTION")).toBe("ef1");
    expect(ligneIntervenant("AUTRE")).toBeNull();
  });

  it("restitue la localisation officielle du CIL", () => {
    expect(libelleGares(incident())).toBe(
      "entre les gares de Givors et de St Romain",
    );
    expect(
      libelleGares(
        incident({ gareMode: "UNIQUE", gareUnique: "Vénissieux", gareA: null }),
      ),
    ).toBe("en gare de Vénissieux");
    expect(libelleGares(incident({ gareMode: null }))).toBe("");
  });
});

describe("depuisCil", () => {
  it("reprend l'en-tête, le lieu et la typologie", () => {
    const valeurs = plat(depuisCil(incident()));
    expect(valeurs.dossier_numero).toBe("2207261435-Givors");
    expect(valeurs.date_evenement).toBe("22/07/2026");
    expect(valeurs.heure_evenement).toBe("14h35");
    expect(valeurs.jour_semaine).toBe("Mercredi");
    expect(valeurs.nature).toBe("Accident de personne");
    expect(valeurs.event_type).toBe("accident_personne");
    expect(valeurs.point_km).toBe("532,572");
    expect(valeurs.numero_voie).toBe("2");
    expect(valeurs.gare_section).toContain("entre les gares de Givors");
    expect(valeurs.gare_section).toContain("poste GIV");
  });

  it("construit un récit horodaté et ordonné", () => {
    const valeurs = plat(depuisCil(incident(), [
      {
        type: "ARRIVAL_ON_SITE",
        occurredAt: "2026-07-22T15:10:00",
        seq: 2,
        label: "Arrivée sur site",
        note: null,
        actorName: "ACHILLE",
      },
      {
        type: "INCIDENT_CREATED",
        occurredAt: "2026-07-22T14:35:00",
        seq: 1,
        label: "Incident créé",
        note: "Avis CRC",
        actorName: null,
      },
    ]));
    const lignes = String(valeurs.recit_chronologique ?? "").split("\n");
    expect(lignes[0]).toContain("14h35");
    expect(lignes[0]).toContain("Incident créé — Avis CRC");
    expect(lignes[1]).toContain("15h10");
    expect(lignes[1]).toContain("(ACHILLE)");
  });

  it("exclut du récit ce qui relève de la 2e partie du RCI", () => {
    const valeurs = plat(depuisCil(incident(), [
      {
        type: "REPRISE_CIRCULATION",
        occurredAt: "2026-07-22T16:00:00",
        seq: 3,
        label: "Reprise de la circulation",
        note: null,
        actorName: null,
      },
      {
        type: "NOTE",
        occurredAt: "2026-07-22T15:30:00",
        seq: 2,
        label: "Constat effectué",
        note: null,
        actorName: null,
      },
    ]));
    expect(valeurs.recit_chronologique).toContain("Constat effectué");
    expect(valeurs.recit_chronologique).not.toContain("Reprise de la circulation");
  });

  it("remplit les présents sur place depuis les intervenants", () => {
    const valeurs = plat(depuisCil(incident(), [], [
      { type: "OPJ", typeLibre: null, nom: "Cdt X", tel: null, arrivedAt: "2026-07-22T15:20:00" },
      { type: "COS", typeLibre: null, nom: null, tel: null, arrivedAt: null },
    ]));
    expect(valeurs.po_police_present).toBe(true);
    expect(valeurs.po_police_heure_arrivee).toBe("15h20");
    expect(valeurs.po_pompiers_present).toBe(true);
    // Arrivée du CIL sur site → représentant SNCF Réseau présent.
    expect(valeurs.po_dpx_present).toBe(true);
    expect(valeurs.po_dpx_heure_arrivee).toBe("15h10");
  });

  it("n'utilise la ligne « Autres » que pour le premier intervenant hors nomenclature", () => {
    const valeurs = plat(depuisCil(incident(), [], [
      { type: "AUTRE", typeLibre: "Mairie", nom: null, tel: null, arrivedAt: null },
      { type: "AUTRE", typeLibre: "ERDF", nom: null, tel: null, arrivedAt: null },
    ]));
    expect(valeurs.po_autres_label).toBe("Mairie");
    expect(valeurs.po_autres_present).toBe(true);
    // Le RCI n'a qu'une ligne libre : le second reste à saisir à la main.
    expect(valeurs.recit_chronologique).toBeUndefined();
  });

  it("ne reprend pas les protections du CIL en mesures conservatoires", () => {
    // Décision métier : une dépêche de protection est une mesure d'exploitation
    // prise pour sécuriser la zone ; la « mesure conservatoire » du RCI vise à
    // figer l'état des lieux pour l'enquête. Les assimiler fausserait le RCI.
    const valeurs = plat(depuisCil(incident()));
    for (const n of [1, 2, 3]) {
      expect(valeurs[`mc_l${n}_heure`]).toBeUndefined();
      expect(valeurs[`mc_l${n}_par_qui`]).toBeUndefined();
      expect(valeurs[`mc_l${n}_mesures`]).toBeUndefined();
    }
  });

  it("ne reprend pas les observations du CIL en conséquences visibles", () => {
    // `observations` est un champ libre du livret : rien ne garantit qu'il
    // porte les conséquences visibles au sens du RCI.
    const valeurs = plat(depuisCil(incident()));
    expect(valeurs.consequences_visibles).toBeUndefined();
  });


  it("place le CIL comme signataire SNCF Réseau supplémentaire", () => {
    const valeurs = plat(depuisCil(incident()));
    // Le sous-rôle n'est pas imposé : c'est à l'agent de qualifier le titre
    // sous lequel le CIL cosigne.
    expect(valeurs.sig_sncf2_sous_role).toBeUndefined();
    expect(valeurs.sig_sncf2_nom_fonction).toBe("Jessie ACHILLE");
    expect(valeurs.sig_sncf2_etablissement).toBe("EIC RAL");
  });

  it("porte le libellé, l'étape et la provenance de chaque proposition", () => {
    const { propositions } = depuisCil(incident());
    const dossier = propositions.find((p) => p.cle === "dossier_numero");
    expect(dossier).toMatchObject({
      libelle: "N° de dossier",
      etape: "quand",
      source: "cil",
    });
    const gare = propositions.find((p) => p.cle === "gare_section");
    expect(gare?.etape).toBe("ou");
    // Aucune proposition ne doit exposer une clé technique sans libellé.
    expect(propositions.every((p) => p.libelle.length > 2)).toBe(true);
  });

  it("ne propose rien quand la source est vide", () => {
    const valeurs = plat(depuisCil(
      incident({
        reference: null,
        km: null,
        voie: null,
        voies: null,
        observations: null,
        cilNom: null,
        cilPrenom: null,
        lieu: "",
        poste: null,
        gareMode: null,
        typeLibre: null,
        type: "AUTRE",
      }),
    ));
    expect(valeurs.dossier_numero).toBeUndefined();
    expect(valeurs.point_km).toBeUndefined();
    expect(valeurs.gare_section).toBeUndefined();
    expect(valeurs.nature).toBeUndefined();
  });
});

describe("depuisSession", () => {
  const session = {
    id: "s1",
    // Slug réel de la fiche réflexe (cf. table Fiche), pas une approximation.
    ficheSlug: "accident-personne",
    ficheTitre: "Accident de personne",
    startedAt: "2026-07-22T14:35:00",
    endedAt: null,
    createdByName: "Jessie ACHILLE",
  };

  it("reprend l'en-tête et la typologie déduite de la fiche", () => {
    const valeurs = plat(depuisSession(session));
    expect(valeurs.date_evenement).toBe("22/07/2026");
    expect(valeurs.nature).toBe("Accident de personne");
    expect(valeurs.event_type).toBe("accident_personne");
    expect(valeurs.rci_etabli_par).toBe("Jessie ACHILLE");
  });

  it("transforme actions et commentaires en récit horodaté", () => {
    const valeurs = plat(depuisSession(session, [
      { timestamp: "2026-07-22T14:50:00", texte: "Réflexion faite", auteur: "AC", genre: "commentaire" },
      { timestamp: "2026-07-22T14:40:00", texte: "Aviser le CRC", auteur: "AC", genre: "action" },
    ]));
    const lignes = String(valeurs.recit_chronologique ?? "").split("\n");
    expect(lignes[0]).toContain("14h40");
    expect(lignes[0]).toContain("Aviser le CRC");
    expect(lignes[1]).toContain("[note] Réflexion faite");
  });

  it("ne fixe pas la typologie tant que la fiche est ambiguë", () => {
    const valeurs = plat(depuisSession({ ...session, ficheSlug: "deraillement" }));
    // Rien de proposé : la typologie reste « autre » jusqu'au choix de l'agent.
    expect(valeurs.event_type).toBeUndefined();
  });

  it("retient la typologie explicitement choisie", () => {
    const r = depuisSession(
      { ...session, ficheSlug: "deraillement" },
      [],
      "deraillement_manoeuvre",
    );
    const valeurs = plat(r);
    expect(valeurs.event_type).toBe("deraillement_manoeuvre");
    expect(
      r.propositions.find((p) => p.cle === "event_type")?.source,
    ).toBe("session");
  });
});

describe("correspondanceFiche", () => {
  it("tranche seule quand la fiche ne couvre qu'une situation", () => {
    expect(correspondanceFiche("accident-personne")).toEqual({
      genre: "certaine",
      typologie: "accident_personne",
    });
    expect(correspondanceFiche("accident-pn")).toEqual({
      genre: "certaine",
      typologie: "collision_pn",
    });
    expect(correspondanceFiche("franchissement-signal")).toEqual({
      genre: "certaine",
      typologie: "franchissement",
    });
  });

  it("propose un choix quand la fiche couvre plusieurs situations", () => {
    const c = correspondanceFiche("deraillement");
    expect(c.genre).toBe("ambigue");
    if (c.genre !== "ambigue") throw new Error("cas ambigu attendu");
    // Déraillement / Talonnage / Bi-voie → les trois situations du RCI,
    // « autre » toujours offert en dernier recours.
    expect(c.choix).toEqual([
      "deraillement_ligne",
      "deraillement_manoeuvre",
      "erreur_direction",
      "autre",
    ]);
  });

  it("ne rapproche rien pour une fiche sans équivalent RCI", () => {
    for (const slug of [
      "colis-suspect",
      "alerte-meteo",
      "agression-agent",
      "incendie-abords-voies",
      "dirigeant-enquete",
    ]) {
      expect(correspondanceFiche(slug), slug).toEqual({ genre: "aucune" });
    }
  });

  it("ne confond pas « dérangement d'un PN » avec un accident à un PN", () => {
    // Un rapprochement par sous-chaîne sur « pn » ferait exactement cette
    // erreur : le dérangement d'un PN n'est pas une collision.
    expect(correspondanceFiche("derangement-pn")).toEqual({ genre: "aucune" });
    expect(correspondanceFiche("derangement-signalisation")).toEqual({
      genre: "aucune",
    });
  });

  it("tolère un slug inconnu ou vide", () => {
    expect(correspondanceFiche("")).toEqual({ genre: "aucune" });
    expect(correspondanceFiche("fiche-inexistante")).toEqual({
      genre: "aucune",
    });
  });
});

describe("grouperPropositions", () => {
  const prop = (
    cle: string,
    valeur: string | boolean,
    source: "cil" | "session",
  ): PropositionChamp => ({
    cle: cle as PropositionChamp["cle"],
    valeur,
    libelle: cle,
    etape: "quand",
    source,
  });

  it("fond en une seule option deux sources qui disent la même chose", () => {
    const g = grouperPropositions([
      prop("date_evenement", "22/07/2026", "cil"),
      prop("date_evenement", "22/07/2026", "session"),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].options).toHaveLength(1);
    // La valeur est créditée aux deux sources, sans question posée.
    expect(g[0].options[0].sources).toEqual(["cil", "session"]);
    expect(estDivergent(g[0])).toBe(false);
  });

  it("expose deux options quand les sources divergent", () => {
    const g = grouperPropositions([
      prop("heure_evenement", "19h52", "cil"),
      prop("heure_evenement", "9h59", "session"),
    ]);
    expect(g).toHaveLength(1);
    expect(estDivergent(g[0])).toBe(true);
    expect(g[0].options).toEqual([
      { valeur: "19h52", sources: ["cil"] },
      { valeur: "9h59", sources: ["session"] },
    ]);
  });

  it("garde un champ par groupe et conserve l'ordre d'apparition", () => {
    const g = grouperPropositions([
      prop("nature", "A", "cil"),
      prop("date_evenement", "B", "cil"),
      prop("nature", "C", "session"),
    ]);
    expect(g.map((x) => x.cle)).toEqual(["nature", "date_evenement"]);
    expect(g[0].options.map((o) => o.valeur)).toEqual(["A", "C"]);
  });

  it("ne duplique pas une source qui répète la même valeur", () => {
    const g = grouperPropositions([
      prop("point_km", "12.4", "cil"),
      prop("point_km", "12.4", "cil"),
    ]);
    expect(g[0].options[0].sources).toEqual(["cil"]);
  });

  it("traite les ternaires comme des valeurs distinctes", () => {
    const g = grouperPropositions([
      prop("po_police_present", true, "cil"),
      prop("po_police_present", false, "session"),
    ]);
    expect(estDivergent(g[0])).toBe(true);
  });

  it("ne rend rien sur une liste vide", () => {
    expect(grouperPropositions([])).toEqual([]);
  });
});

describe("acceptation champ par champ", () => {
  const prop = (
    cle: string,
    valeur: string | boolean,
  ): PropositionChamp => ({
    cle: cle as PropositionChamp["cle"],
    valeur,
    libelle: cle,
    etape: "quand",
    source: "cil",
  });

  it("applique la valeur retenue, même sur un champ déjà rempli", () => {
    // L'agent a vu l'ancienne valeur et a tranché : on respecte sa décision.
    const actuel = { ...emptyPayload(), point_km: "999" };
    const apres = accepter(actuel, prop("point_km", "532,572"));
    expect(apres.point_km).toBe("532,572");
  });

  it("n'altère aucun autre champ", () => {
    const actuel = { ...emptyPayload(), nature: "Collision", point_km: "12" };
    const apres = accepter(actuel, prop("point_km", "99"));
    expect(apres.nature).toBe("Collision");
    expect(Object.keys(apres).length).toBe(Object.keys(actuel).length);
  });

  it("écarte les propositions dont la valeur est déjà en place", () => {
    const actuel = { ...emptyPayload(), point_km: "532,572" };
    const utiles = propositionsUtiles(actuel, [
      prop("point_km", "532,572"),
      prop("nature", "Accident de personne"),
    ]);
    expect(utiles.map((p) => p.cle)).toEqual(["nature"]);
  });

  it("conserve une proposition qui contredit la saisie — à l'agent de trancher", () => {
    const actuel = { ...emptyPayload(), point_km: "999" };
    const utiles = propositionsUtiles(actuel, [prop("point_km", "532,572")]);
    expect(utiles).toHaveLength(1);
  });

  it("garde une proposition « oui » face à un « non » constaté", () => {
    // Un ternaire répondu « non » est une constatation : la proposition reste
    // visible pour que la contradiction saute aux yeux, sans être appliquée.
    const actuel = { ...emptyPayload(), po_police_present: false as const };
    const utiles = propositionsUtiles(actuel, [prop("po_police_present", true)]);
    expect(utiles).toHaveLength(1);
  });
});

