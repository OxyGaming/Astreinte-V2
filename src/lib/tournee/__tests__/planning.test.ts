import { describe, expect, it } from "vitest";
import {
  calculerBilan,
  calculerProgression,
  calculerSituation,
  classerEcart,
  construirePlanTheorique,
  syntheseEquipe,
} from "../planning";
import { formatChrono, formatDateLongue, formatEcart, formatHHmm, parisToEpoch } from "../time";
import type { TourneeEvent, TourneePlanEtape } from "../types";

const DATE = "2026-06-15";
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return parisToEpoch(DATE, h * 60 + m);
};

function etape(p: Partial<TourneePlanEtape> & { key: string }): TourneePlanEtape {
  return {
    type: "POINT",
    titre: p.key,
    optionnelle: false,
    dureeMin: 0,
    trajetSuivanteMin: 0,
    localisationMasquee: false,
    liens: [],
    contenu: [],
    photos: [],
    ...p,
  };
}

// Parcours fictif : départ 8h45 → A (30) → B (10) → [O optionnelle] → C imposée 10h30 → F.
const ETAPES: TourneePlanEtape[] = [
  etape({ key: "D", type: "DEPART", dureeMin: 0, trajetSuivanteMin: 15 }),
  etape({ key: "A", dureeMin: 30, trajetSuivanteMin: 10 }),
  etape({ key: "B", dureeMin: 10, trajetSuivanteMin: 10 }),
  etape({ key: "O", optionnelle: true, dureeMin: 10, surcoutTrajetMin: 5 }),
  etape({ key: "C", heureImposee: "10:30", dureeMin: 20, trajetSuivanteMin: 10 }),
  etape({ key: "F", type: "RESTITUTION", dureeMin: 0 }),
];
const PLAN = construirePlanTheorique(ETAPES, DATE, "08:45");

const ev = (type: TourneeEvent["type"], etapeKey: string | null, hhmm: string): TourneeEvent => ({
  type,
  etapeKey,
  at: at(hhmm),
});
const departValide: TourneeEvent[] = [
  ev("TOURNEE_DEBUT", null, "08:45"),
  ev("ETAPE_DEBUT", "D", "08:45"),
  ev("ETAPE_FIN", "D", "08:45"),
];

describe("plan théorique", () => {
  it("cumule durées et trajets des obligatoires", () => {
    const t = (k: string) => PLAN.byKey.get(k)!;
    expect(formatHHmm(t("A").debut!)).toBe("09:00");
    expect(formatHHmm(t("A").fin!)).toBe("09:30");
    expect(formatHHmm(t("B").debut!)).toBe("09:40");
    expect(formatHHmm(t("B").fin!)).toBe("09:50");
  });

  it("une heure imposée crée une marge en amont", () => {
    const c = PLAN.byKey.get("C")!;
    expect(formatHHmm(c.debut!)).toBe("10:30");
    expect(c.margeAvantMin).toBe(30);
    expect(formatHHmm(PLAN.byKey.get("F")!.debut!)).toBe("11:00");
  });

  it("les optionnelles sont hors chaîne horaire", () => {
    const o = PLAN.byKey.get("O")!;
    expect(o.debut).toBeNull();
    expect(o.apresKey).toBe("B");
    expect(o.coutMin).toBe(15);
    expect(PLAN.obligatoires).toEqual(["D", "A", "B", "C", "F"]);
  });
});

describe("écart / position réelle vs théorique", () => {
  it("avant le départ : à venir, pas d'écart", () => {
    const s = calculerSituation(ETAPES, PLAN, [], at("08:30"));
    expect(s.niveau).toBe("a_venir");
    expect(s.ecartMin).toBe(0);
  });

  it("dépassement en cours d'étape : +7 min et timer négatif", () => {
    const events = [...departValide, ev("ETAPE_DEBUT", "A", "09:03")];
    const s = calculerSituation(ETAPES, PLAN, events, at("09:37"));
    expect(s.ecartMin).toBe(7);
    expect(s.restantEtapeMs).toBe(-4 * 60_000);
    expect(s.niveau).toBe("retard");
  });

  it("étape démarrée en retard mais encore dans son temps : retard = retard au début", () => {
    const events = [...departValide, ev("ETAPE_DEBUT", "A", "09:03")];
    const s = calculerSituation(ETAPES, PLAN, events, at("09:10"));
    expect(s.ecartMin).toBe(3);
  });

  it("pendant le trajet, le retard grossit si l'arrivée prévue est dépassée", () => {
    const events = [...departValide, ev("ETAPE_DEBUT", "A", "09:03"), ev("ETAPE_FIN", "A", "09:37")];
    expect(calculerSituation(ETAPES, PLAN, events, at("09:40")).ecartMin).toBe(7);
    expect(calculerSituation(ETAPES, PLAN, events, at("09:50")).ecartMin).toBe(10);
  });

  it("récupération : une étape plus courte réduit le retard (pas une somme de dépassements)", () => {
    const events = [
      ...departValide,
      ev("ETAPE_DEBUT", "A", "09:03"),
      ev("ETAPE_FIN", "A", "09:37"), // +7
      ev("ETAPE_DEBUT", "B", "09:45"),
      ev("ETAPE_FIN", "B", "09:50"), // B en 5 min au lieu de 10
    ];
    const s = calculerSituation(ETAPES, PLAN, events, at("09:51"));
    expect(s.ecartMin).toBe(0);
    expect(s.niveau).toBe("dans_les_temps");
  });

  it("avance : terminer plus tôt donne un écart négatif", () => {
    const events = [...departValide, ev("ETAPE_DEBUT", "A", "08:58"), ev("ETAPE_FIN", "A", "09:20")];
    const s = calculerSituation(ETAPES, PLAN, events, at("09:21"));
    expect(s.ecartMin).toBe(-10);
    expect(s.niveau).toBe("avance");
  });

  it("l'heure imposée absorbe l'avance dans la projection", () => {
    const events = [...departValide, ev("ETAPE_DEBUT", "A", "09:00"), ev("ETAPE_FIN", "A", "09:30")];
    const s = calculerSituation(ETAPES, PLAN, events, at("09:31"));
    expect(formatHHmm(s.projections.get("C")!.debutProjete!)).toBe("10:30");
  });

  it("une optionnelle réalisée consomme du temps (détour + présence)", () => {
    const events = [
      ...departValide,
      ev("ETAPE_DEBUT", "A", "09:00"),
      ev("ETAPE_FIN", "A", "09:30"),
      ev("ETAPE_DEBUT", "B", "09:40"),
      ev("ETAPE_FIN", "B", "09:50"),
      ev("ETAPE_DEBUT", "O", "09:55"),
      ev("ETAPE_FIN", "O", "10:05"),
    ];
    const s = calculerSituation(ETAPES, PLAN, events, at("10:05"));
    // arrivée projetée à C : 10:15 vs position théorique 10:00
    expect(s.ecartMin).toBe(15);
    expect(formatHHmm(s.arriveeProchaineProjetee!)).toBe("10:15");
    // mais l'échéance de 10h30 reste tenue
    expect(formatHHmm(s.projections.get("C")!.debutProjete!)).toBe("10:30");
  });
});

describe("faisabilité des étapes optionnelles", () => {
  const apresB = (finB: string) => [
    ...departValide,
    ev("ETAPE_DEBUT", "A", "09:00"),
    ev("ETAPE_FIN", "A", "09:30"),
    ev("ETAPE_DEBUT", "B", "09:40"),
    ev("ETAPE_FIN", "B", finB),
  ];

  it("faisable avec de la marge", () => {
    const f = calculerSituation(ETAPES, PLAN, apresB("09:50"), at("09:50")).faisabilites.get("O")!;
    expect(f.disponibleMin).toBe(30);
    expect(f.necessaireMin).toBe(15);
    expect(f.margeMin).toBe(15);
    expect(f.niveau).toBe("faisable");
    expect(f.echeanceKey).toBe("C");
  });

  it("juste quand la marge passe sous le seuil de confort", () => {
    const f = calculerSituation(ETAPES, PLAN, apresB("10:02"), at("10:02")).faisabilites.get("O")!;
    expect(f.disponibleMin).toBe(18);
    expect(f.margeMin).toBe(3);
    expect(f.niveau).toBe("juste");
  });

  it("non faisable si le retard est trop important", () => {
    const f = calculerSituation(ETAPES, PLAN, apresB("10:12"), at("10:12")).faisabilites.get("O")!;
    expect(f.margeMin).toBe(-7);
    expect(f.niveau).toBe("non_faisable");
    expect(f.decisionAvant).toBeNull();
  });

  it("recalculée en temps réel pendant l'étape précédente", () => {
    const events = [...departValide, ev("ETAPE_DEBUT", "A", "09:00"), ev("ETAPE_FIN", "A", "09:30"), ev("ETAPE_DEBUT", "B", "09:40")];
    const tot = calculerSituation(ETAPES, PLAN, events, at("09:45")).faisabilites.get("O")!;
    const tard = calculerSituation(ETAPES, PLAN, events, at("10:10")).faisabilites.get("O")!;
    expect(tot.margeMin).toBe(15);
    expect(tard.margeMin).toBe(-5);
  });
});

describe("progression", () => {
  it("une optionnelle dépassée est ignorée implicitement, sans bloquer", () => {
    const events = [
      ...departValide,
      ev("ETAPE_DEBUT", "A", "09:00"),
      ev("ETAPE_FIN", "A", "09:30"),
      ev("ETAPE_DEBUT", "B", "09:40"),
      ev("ETAPE_FIN", "B", "09:50"),
      ev("ETAPE_DEBUT", "C", "10:30"),
    ];
    const p = calculerProgression(ETAPES, events);
    expect(p.etats.get("O")!.statut).toBe("ignoree");
    expect(p.etats.get("O")!.implicite).toBe(true);
    expect(p.enCoursKey).toBe("C");
  });

  it("ignorer explicitement puis reprendre", () => {
    const base = [...departValide, ev("ETAPE_DEBUT", "A", "09:00"), ev("ETAPE_FIN", "A", "09:30")];
    const ign = calculerProgression(ETAPES, [...base, ev("ETAPE_IGNOREE", "O", "09:31")]);
    expect(ign.etats.get("O")!.statut).toBe("ignoree");
    const rep = calculerProgression(ETAPES, [...base, ev("ETAPE_IGNOREE", "O", "09:31"), ev("ETAPE_REPRISE", "O", "09:32")]);
    expect(rep.etats.get("O")!.statut).toBe("a_venir");
  });

  it("propose la prochaine étape quand aucune n'est en cours", () => {
    const p = calculerProgression(ETAPES, [...departValide, ev("ETAPE_DEBUT", "A", "09:00"), ev("ETAPE_FIN", "A", "09:30")]);
    expect(p.prochaineKey).toBe("B");
  });

  it("démarrer une étape clôt celle en cours", () => {
    const p = calculerProgression(ETAPES, [...departValide, ev("ETAPE_DEBUT", "A", "09:00"), ev("ETAPE_DEBUT", "B", "09:35")]);
    expect(p.etats.get("A")!.statut).toBe("terminee");
    expect(p.etats.get("A")!.fin).toBe(at("09:35"));
  });
});

describe("bilan", () => {
  it("compare prévu / réel par étape et l'écart final", () => {
    const events = [
      ...departValide,
      ev("ETAPE_DEBUT", "A", "09:03"),
      ev("ETAPE_FIN", "A", "09:40"),
      ev("ETAPE_DEBUT", "B", "09:48"),
      ev("ETAPE_FIN", "B", "09:56"),
      ev("ETAPE_IGNOREE", "O", "09:56"),
      ev("ETAPE_DEBUT", "C", "10:30"),
      ev("ETAPE_FIN", "C", "10:51"),
      ev("ETAPE_DEBUT", "F", "10:58"),
      ev("ETAPE_FIN", "F", "10:58"),
      ev("TOURNEE_FIN", null, "10:58"),
    ];
    const p = calculerProgression(ETAPES, events);
    const b = calculerBilan(ETAPES, PLAN, p);
    const a = b.lignes.find((l) => l.key === "A")!;
    expect(a.dureeReelleMin).toBe(37);
    expect(a.ecartDureeMin).toBe(7);
    expect(b.lignes.find((l) => l.key === "B")!.ecartDureeMin).toBe(-2);
    expect(b.ecartFinalMin).toBe(-2);
    const s = calculerSituation(ETAPES, PLAN, events, at("11:30"));
    expect(s.ecartMin).toBe(-2);
  });
});

describe("équipe et seuils", () => {
  it("classe l'écart selon les seuils", () => {
    expect(classerEcart(1)).toBe("dans_les_temps");
    expect(classerEcart(-5)).toBe("avance");
    expect(classerEcart(8)).toBe("retard");
    expect(classerEcart(20)).toBe("retard_fort");
  });

  it("synthèse : moyenne des écarts des participants démarrés", () => {
    const mk = (finA: string) =>
      calculerSituation(ETAPES, PLAN, [...departValide, ev("ETAPE_DEBUT", "A", "09:00"), ev("ETAPE_FIN", "A", finA)], at(finA));
    const s = syntheseEquipe([mk("09:32"), mk("09:27"), mk("09:38"), mk("09:45"), calculerSituation(ETAPES, PLAN, [], at("09:00"))]);
    expect(s.participants).toBe(5);
    expect(s.demarres).toBe(4);
    expect(s.ecartMoyenMin).toBe(5.5);
    expect(s.enAvance).toBe(1);
    expect(s.dansLesTemps).toBe(1);
    expect(s.enRetard).toBe(2);
  });
});

describe("time", () => {
  it("convertit en heure de Paris (été / hiver)", () => {
    expect(new Date(parisToEpoch("2026-07-01", 9 * 60)).toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(new Date(parisToEpoch("2026-12-01", 9 * 60)).toISOString()).toBe("2026-12-01T08:00:00.000Z");
    expect(new Date(parisToEpoch("2026-10-25", 9 * 60)).toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });

  it("formats", () => {
    expect(formatDateLongue("2026-10-01")).toBe("jeudi 1er octobre 2026");
    expect(formatEcart(7)).toBe("+7 min");
    expect(formatEcart(-3)).toBe("−3 min");
    expect(formatChrono(18 * 60_000 + 42_000)).toBe("18:42");
    expect(formatChrono(-(4 * 60_000 + 12_000))).toBe("+04:12");
  });
});
