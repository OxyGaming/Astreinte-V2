/**
 * Moteur de temps du module Tournée — PUR (aucune dépendance React / Prisma).
 *
 * Principes (cf. cahier des charges §25) :
 *   • Le plan théorique se construit en cumulant, pour les étapes OBLIGATOIRES,
 *     durée de présence + trajet vers l'étape obligatoire suivante, à partir de
 *     l'heure de départ. Une heure imposée décale le début à
 *     max(heure calculée, heure imposée) et crée donc une marge en amont.
 *   • Les étapes OPTIONNELLES sont hors chaîne horaire (comme le document de
 *     référence) : elles consomment la marge disponible avant la prochaine
 *     échéance.
 *   • L'écart compare la POSITION réelle à la position théorique — ce n'est
 *     pas une somme de dépassements : une étape plus courte récupère le retard.
 *   • Rien n'est bloquant : le moteur ne fait que décrire.
 *
 * Tous les instants sont des epoch ms ; les durées exposées sont en minutes.
 */
import { hhmmToMinutes, parisToEpoch } from "./time";
import type { TourneeEvent, TourneePlanEtape, TourneeSeuils } from "./types";
import { DEFAULT_SEUILS } from "./types";

const MIN = 60_000;

// ─── Plan théorique ───────────────────────────────────────────────────────────

export interface EtapeTheorique {
  key: string;
  index: number;
  optionnelle: boolean;
  /** Obligatoires uniquement. */
  debut: number | null;
  fin: number | null;
  /** Marge créée par une heure imposée avant cette étape (min). */
  margeAvantMin: number;
  /** Obligatoires : trajet vers l'obligatoire suivante (min). */
  trajetSuivanteMin: number;
  /** Optionnelles : clé de l'obligatoire qui précède (null si aucune). */
  apresKey: string | null;
  /** Optionnelles : coût total si réalisée (détour + présence), en min. */
  coutMin: number;
}

export interface PlanTheorique {
  depart: number;
  fin: number;
  etapes: EtapeTheorique[];
  byKey: Map<string, EtapeTheorique>;
  /** Clés des étapes obligatoires, dans l'ordre. */
  obligatoires: string[];
}

export function construirePlanTheorique(
  etapes: TourneePlanEtape[],
  date: string,
  heureDepart: string,
): PlanTheorique {
  const depart = parisToEpoch(date, hhmmToMinutes(heureDepart));
  let curseur = depart;
  let derniereObligatoire: string | null = null;
  const out: EtapeTheorique[] = [];
  const obligatoires: string[] = [];
  let fin = depart;

  etapes.forEach((e, index) => {
    if (e.optionnelle) {
      out.push({
        key: e.key,
        index,
        optionnelle: true,
        debut: null,
        fin: null,
        margeAvantMin: 0,
        trajetSuivanteMin: 0,
        apresKey: derniereObligatoire,
        coutMin: Math.max(0, e.surcoutTrajetMin ?? 0) + Math.max(0, e.dureeMin),
      });
      return;
    }
    let debut = curseur;
    let margeAvantMin = 0;
    if (e.heureImposee) {
      const impose = parisToEpoch(date, hhmmToMinutes(e.heureImposee));
      if (impose > debut) {
        margeAvantMin = (impose - debut) / MIN;
        debut = impose;
      }
    }
    const finEtape = debut + Math.max(0, e.dureeMin) * MIN;
    out.push({
      key: e.key,
      index,
      optionnelle: false,
      debut,
      fin: finEtape,
      margeAvantMin,
      trajetSuivanteMin: Math.max(0, e.trajetSuivanteMin),
      apresKey: derniereObligatoire,
      coutMin: 0,
    });
    obligatoires.push(e.key);
    derniereObligatoire = e.key;
    curseur = finEtape + Math.max(0, e.trajetSuivanteMin) * MIN;
    fin = finEtape;
  });

  return { depart, fin, etapes: out, byKey: new Map(out.map((x) => [x.key, x])), obligatoires };
}

// ─── Progression d'un participant ─────────────────────────────────────────────

export type StatutEtape = "a_venir" | "en_cours" | "terminee" | "ignoree" | "non_realisee";

export interface EtatEtape {
  key: string;
  statut: StatutEtape;
  debut: number | null;
  fin: number | null;
  /** true si ignorée sans action explicite (dépassée par la progression). */
  implicite?: boolean;
}

export interface Progression {
  demarre: boolean;
  termine: boolean;
  debutTournee: number | null;
  finTournee: number | null;
  etats: Map<string, EtatEtape>;
  /** Étape en cours (au plus une — la plus récemment démarrée). */
  enCoursKey: string | null;
  /** Prochaine étape proposée (obligatoire ou optionnelle) si aucune en cours. */
  prochaineKey: string | null;
  /** Dernière étape obligatoire terminée (dans l'ordre du plan). */
  derniereObligatoireTermineeKey: string | null;
}

/** Rejoue le journal d'un participant. Les événements sont triés par instant. */
export function calculerProgression(etapes: TourneePlanEtape[], events: TourneeEvent[]): Progression {
  const etats = new Map<string, EtatEtape>(
    etapes.map((e) => [e.key, { key: e.key, statut: "a_venir" as StatutEtape, debut: null, fin: null }]),
  );
  let debutTournee: number | null = null;
  let finTournee: number | null = null;
  let enCoursKey: string | null = null;

  const tries = events.map((e, i) => ({ e, i })).sort((a, b) => a.e.at - b.e.at || a.i - b.i);
  for (const { e } of tries) {
    const etat = e.etapeKey ? etats.get(e.etapeKey) : undefined;
    switch (e.type) {
      case "TOURNEE_DEBUT":
        if (debutTournee === null) debutTournee = e.at;
        finTournee = null;
        break;
      case "TOURNEE_FIN":
        finTournee = e.at;
        break;
      case "ETAPE_DEBUT":
        if (!etat) break;
        if (debutTournee === null) debutTournee = e.at;
        // Démarrer une étape clôt implicitement celle en cours.
        if (enCoursKey && enCoursKey !== etat.key) {
          const prev = etats.get(enCoursKey)!;
          prev.statut = "terminee";
          prev.fin = e.at;
        }
        etat.statut = "en_cours";
        etat.debut = e.at;
        etat.fin = null;
        enCoursKey = etat.key;
        break;
      case "ETAPE_FIN":
        if (!etat) break;
        if (etat.debut === null) etat.debut = e.at;
        etat.statut = "terminee";
        etat.fin = e.at;
        if (enCoursKey === etat.key) enCoursKey = null;
        break;
      case "ETAPE_IGNOREE":
        if (!etat) break;
        etat.statut = "ignoree";
        etat.debut = null;
        etat.fin = null;
        if (enCoursKey === etat.key) enCoursKey = null;
        break;
      case "ETAPE_REPRISE":
        if (!etat) break;
        etat.statut = "a_venir";
        etat.debut = null;
        etat.fin = null;
        if (enCoursKey === etat.key) enCoursKey = null;
        break;
    }
  }

  // Index de progression = dernière étape touchée (en cours / terminée / ignorée).
  let maxTouche = -1;
  etapes.forEach((e, i) => {
    const s = etats.get(e.key)!.statut;
    if (s === "en_cours" || s === "terminee" || s === "ignoree") maxTouche = i;
  });
  // Étapes laissées derrière : optionnelles → ignorées (implicite), obligatoires → non réalisées.
  etapes.forEach((e, i) => {
    const etat = etats.get(e.key)!;
    if (i < maxTouche && etat.statut === "a_venir") {
      etat.statut = e.optionnelle ? "ignoree" : "non_realisee";
      etat.implicite = true;
    }
  });

  let derniereObligatoireTermineeKey: string | null = null;
  etapes.forEach((e) => {
    if (!e.optionnelle && etats.get(e.key)!.statut === "terminee") derniereObligatoireTermineeKey = e.key;
  });

  let prochaineKey: string | null = null;
  if (!enCoursKey && finTournee === null) {
    const suivante = etapes.find((e, i) => i > maxTouche && etats.get(e.key)!.statut === "a_venir");
    prochaineKey = suivante?.key ?? null;
  }

  return {
    demarre: debutTournee !== null,
    termine: finTournee !== null,
    debutTournee,
    finTournee,
    etats,
    enCoursKey,
    prochaineKey,
    derniereObligatoireTermineeKey,
  };
}

// ─── Situation temporelle ─────────────────────────────────────────────────────

export type NiveauEcart = "a_venir" | "avance" | "dans_les_temps" | "retard" | "retard_fort";

export function classerEcart(ecartMin: number, seuils: TourneeSeuils = DEFAULT_SEUILS): NiveauEcart {
  if (ecartMin < -seuils.toleranceMin) return "avance";
  if (ecartMin <= seuils.toleranceMin) return "dans_les_temps";
  if (ecartMin < seuils.rougeMin) return "retard";
  return "retard_fort";
}

export type NiveauFaisabilite = "faisable" | "juste" | "non_faisable";

export interface Faisabilite {
  key: string;
  niveau: NiveauFaisabilite;
  /** Temps disponible avant l'échéance (min, peut être négatif). */
  disponibleMin: number;
  /** Détour + présence (min). */
  necessaireMin: number;
  margeMin: number;
  dureeMin: number;
  trajetMin: number;
  /** Clé de l'échéance retenue et son heure. */
  echeanceKey: string | null;
  echeanceAt: number | null;
  /** Heure limite de décision (au-delà, la marge devient négative). */
  decisionAvant: number | null;
}

export interface SituationEtape {
  key: string;
  /** Début / fin projetés (obligatoires non réalisées). */
  debutProjete: number | null;
  finProjetee: number | null;
}

export interface Situation {
  progression: Progression;
  /** Écart signé en minutes (positif = retard). null si non démarré et dans le futur. */
  ecartMin: number;
  niveau: NiveauEcart;
  /** Étape obligatoire servant de référence à l'écart. */
  referenceKey: string | null;
  /** Arrivée projetée à la prochaine obligatoire non démarrée. */
  arriveeProchaineProjetee: number | null;
  finProjetee: number;
  projections: Map<string, SituationEtape>;
  faisabilites: Map<string, Faisabilite>;
  /** Étape en cours : temps restant (ms, négatif = dépassement). */
  restantEtapeMs: number | null;
}

/**
 * Calcule la situation d'un participant à l'instant `now`.
 */
export function calculerSituation(
  etapes: TourneePlanEtape[],
  plan: PlanTheorique,
  events: TourneeEvent[],
  now: number,
  seuils: TourneeSeuils = DEFAULT_SEUILS,
): Situation {
  const progression = calculerProgression(etapes, events);
  const byKey = new Map(etapes.map((e) => [e.key, e]));
  const etat = (k: string) => progression.etats.get(k)!;
  const th = (k: string) => plan.byKey.get(k)!;

  let ecartMs = 0;
  let referenceKey: string | null = null;
  let restantEtapeMs: number | null = null;
  // Point de départ de la projection : instant où l'on pourra démarrer la
  // prochaine obligatoire non démarrée, et son index dans `plan.obligatoires`.
  let projeteArrivee: number;
  let prochaineObligIdx: number;

  const enCours = progression.enCoursKey ? byKey.get(progression.enCoursKey)! : null;
  if (enCours) {
    const e = etat(enCours.key);
    restantEtapeMs = e.debut! + enCours.dureeMin * MIN - now;
  }

  const obligs = plan.obligatoires;
  const lastDoneIdx = (() => {
    let idx = -1;
    obligs.forEach((k, i) => {
      if (etat(k).statut === "terminee") idx = i;
    });
    return idx;
  })();

  if (progression.termine && lastDoneIdx >= 0) {
    const k = obligs[lastDoneIdx];
    referenceKey = k;
    ecartMs = etat(k).fin! - th(k).fin!;
    projeteArrivee = etat(k).fin!;
    prochaineObligIdx = obligs.length;
  } else if (enCours && !enCours.optionnelle) {
    // Sur une étape obligatoire : fin projetée = max(début + durée, maintenant).
    const e = etat(enCours.key);
    const t = th(enCours.key);
    const finProj = Math.max(e.debut! + enCours.dureeMin * MIN, now);
    referenceKey = enCours.key;
    ecartMs = finProj - t.fin!;
    projeteArrivee = finProj + t.trajetSuivanteMin * MIN;
    prochaineObligIdx = obligs.indexOf(enCours.key) + 1;
  } else if (!progression.demarre) {
    const premier = obligs[0];
    referenceKey = premier ?? null;
    const debutPrevu = premier ? th(premier).debut! : plan.depart;
    ecartMs = Math.max(0, now - debutPrevu);
    projeteArrivee = Math.max(now, debutPrevu);
    prochaineObligIdx = 0;
  } else if (lastDoneIdx < 0) {
    // Démarré mais aucune obligatoire terminée (ex. optionnelle en tête) :
    // la prochaine obligatoire est la première.
    const premier = obligs[0];
    referenceKey = premier ?? null;
    const debutPrevu = premier ? th(premier).debut! : plan.depart;
    projeteArrivee = Math.max(now, debutPrevu);
    ecartMs = projeteArrivee - debutPrevu;
    prochaineObligIdx = 0;
  } else {
    // Dans un intervalle après l'obligatoire L : trajet, éventuellement
    // ponctué d'étapes optionnelles.
    const L = obligs[lastDoneIdx];
    const tL = th(L);
    const finL = etat(L).fin!;
    referenceKey = L;
    let surPlace = 0;
    let restantSurPlace = 0;
    let surcout = 0;
    for (const e of etapes) {
      const t = th(e.key);
      if (!e.optionnelle || t.apresKey !== L) continue;
      const s = etat(e.key);
      if (s.statut === "terminee" && s.debut !== null && s.fin !== null && s.debut >= finL) {
        surPlace += s.fin - s.debut;
        surcout += Math.max(0, e.surcoutTrajetMin ?? 0) * MIN;
      } else if (s.statut === "en_cours" && s.debut !== null) {
        surPlace += now - s.debut;
        restantSurPlace = Math.max(0, s.debut + e.dureeMin * MIN - now);
        surcout += Math.max(0, e.surcoutTrajetMin ?? 0) * MIN;
      }
    }
    const trajetTotal = tL.trajetSuivanteMin * MIN + surcout;
    const parcouru = Math.max(0, now - finL - surPlace);
    const resteTrajet = Math.max(0, trajetTotal - parcouru);
    projeteArrivee = now + restantSurPlace + resteTrajet;
    ecartMs = projeteArrivee - (tL.fin! + tL.trajetSuivanteMin * MIN);
    prochaineObligIdx = lastDoneIdx + 1;
  }

  // ── Projection des obligatoires restantes ──
  const projections = new Map<string, SituationEtape>();
  const arriveeParIdx: number[] = [];
  let curseur = projeteArrivee;
  for (let i = prochaineObligIdx; i < obligs.length; i++) {
    const k = obligs[i];
    const e = byKey.get(k)!;
    arriveeParIdx[i] = curseur;
    let debut = curseur;
    if (e.heureImposee) debut = Math.max(debut, th(k).debut!);
    const fin = debut + e.dureeMin * MIN;
    projections.set(k, { key: k, debutProjete: debut, finProjetee: fin });
    curseur = fin + e.trajetSuivanteMin * MIN;
  }
  const finProjetee = obligs.length
    ? projections.get(obligs[obligs.length - 1])?.finProjetee ?? etat(obligs[obligs.length - 1]).fin ?? plan.fin
    : plan.fin;

  // ── Faisabilité des optionnelles encore à venir ──
  const faisabilites = new Map<string, Faisabilite>();
  for (const e of etapes) {
    if (!e.optionnelle || etat(e.key).statut !== "a_venir") continue;
    const t = th(e.key);
    // Prochaine obligatoire après l'optionnelle.
    const idxApres = t.apresKey ? obligs.indexOf(t.apresKey) + 1 : 0;
    if (idxApres < prochaineObligIdx) continue; // déjà dépassée
    // Échéance : 1re obligatoire à heure imposée à partir de idxApres, sinon la dernière.
    let echeIdx = -1;
    for (let i = idxApres; i < obligs.length; i++) {
      if (byKey.get(obligs[i])!.heureImposee) {
        echeIdx = i;
        break;
      }
    }
    if (echeIdx < 0) echeIdx = obligs.length - 1;
    const dureeMin = Math.max(0, e.dureeMin);
    const trajetMin = Math.max(0, e.surcoutTrajetMin ?? 0);
    const necessaireMin = dureeMin + trajetMin;
    if (echeIdx < 0 || echeIdx < prochaineObligIdx) {
      faisabilites.set(e.key, {
        key: e.key, niveau: "non_faisable", disponibleMin: 0, necessaireMin, margeMin: -necessaireMin,
        dureeMin, trajetMin, echeanceKey: null, echeanceAt: null, decisionAvant: null,
      });
      continue;
    }
    const echeKey = obligs[echeIdx];
    const echeAt = th(echeKey).debut!;
    const arrivee = arriveeParIdx[echeIdx] ?? projeteArrivee;
    const disponibleMin = (echeAt - arrivee) / MIN;
    const margeMin = disponibleMin - necessaireMin;
    const seuil = seuils.margeConfortMin;
    const niveau: NiveauFaisabilite = margeMin >= seuil ? "faisable" : margeMin >= 0 ? "juste" : "non_faisable";
    // Heure limite : fin projetée de l'obligatoire qui précède (ou maintenant si
    // elle est terminée) + marge.
    const precedente = t.apresKey;
    const finPrecedente = precedente
      ? etat(precedente).statut === "terminee"
        ? now
        : projections.get(precedente)?.finProjetee ?? now
      : Math.max(now, plan.depart);
    faisabilites.set(e.key, {
      key: e.key,
      niveau,
      disponibleMin,
      necessaireMin,
      margeMin,
      dureeMin,
      trajetMin,
      echeanceKey: echeKey,
      echeanceAt: echeAt,
      decisionAvant: margeMin >= 0 ? finPrecedente + margeMin * MIN : null,
    });
  }

  const ecartMin = ecartMs / MIN;
  return {
    progression,
    ecartMin,
    niveau: progression.demarre || ecartMin > 0 ? classerEcart(ecartMin, seuils) : "a_venir",
    referenceKey,
    arriveeProchaineProjetee: prochaineObligIdx < obligs.length ? projeteArrivee : null,
    finProjetee,
    projections,
    faisabilites,
    restantEtapeMs,
  };
}

// ─── Bilan ────────────────────────────────────────────────────────────────────

export interface LigneBilan {
  key: string;
  optionnelle: boolean;
  statut: StatutEtape;
  debutPrevu: number | null;
  finPrevue: number | null;
  dureePrevueMin: number;
  debutReel: number | null;
  finReelle: number | null;
  dureeReelleMin: number | null;
  /** Écart de durée (réel − prévu), en min. */
  ecartDureeMin: number | null;
  /** Écart de position au début (réel − prévu), en min. */
  ecartDebutMin: number | null;
}

export interface Bilan {
  debutPrevu: number;
  finPrevue: number;
  debutReel: number | null;
  finReelle: number | null;
  ecartFinalMin: number | null;
  lignes: LigneBilan[];
}

export function calculerBilan(etapes: TourneePlanEtape[], plan: PlanTheorique, progression: Progression): Bilan {
  const lignes: LigneBilan[] = etapes.map((e) => {
    const t = plan.byKey.get(e.key)!;
    const s = progression.etats.get(e.key)!;
    const dureeReelleMin = s.debut !== null && s.fin !== null ? (s.fin - s.debut) / MIN : null;
    return {
      key: e.key,
      optionnelle: e.optionnelle,
      statut: s.statut,
      debutPrevu: t.debut,
      finPrevue: t.fin,
      dureePrevueMin: e.dureeMin,
      debutReel: s.debut,
      finReelle: s.fin,
      dureeReelleMin,
      ecartDureeMin: dureeReelleMin !== null ? dureeReelleMin - e.dureeMin : null,
      ecartDebutMin: s.debut !== null && t.debut !== null ? (s.debut - t.debut) / MIN : null,
    };
  });
  const premiereReelle = lignes.find((l) => l.debutReel !== null)?.debutReel ?? progression.debutTournee;
  const derniere = [...lignes].reverse().find((l) => l.finReelle !== null);
  const finReelle = progression.finTournee ?? derniere?.finReelle ?? null;
  return {
    debutPrevu: plan.depart,
    finPrevue: plan.fin,
    debutReel: premiereReelle ?? null,
    finReelle,
    ecartFinalMin: finReelle !== null ? (finReelle - plan.fin) / MIN : null,
    lignes,
  };
}

// ─── Synthèse d'équipe ────────────────────────────────────────────────────────

export interface SyntheseEquipe {
  participants: number;
  demarres: number;
  ecartMoyenMin: number | null;
  niveau: NiveauEcart;
  enAvance: number;
  dansLesTemps: number;
  enRetard: number;
}

export function syntheseEquipe(situations: Situation[], seuils: TourneeSeuils = DEFAULT_SEUILS): SyntheseEquipe {
  const actifs = situations.filter((s) => s.progression.demarre);
  const ecarts = actifs.map((s) => s.ecartMin);
  const moyenne = ecarts.length ? ecarts.reduce((a, b) => a + b, 0) / ecarts.length : null;
  const niveaux = actifs.map((s) => classerEcart(s.ecartMin, seuils));
  return {
    participants: situations.length,
    demarres: actifs.length,
    ecartMoyenMin: moyenne,
    niveau: moyenne === null ? "a_venir" : classerEcart(moyenne, seuils),
    enAvance: niveaux.filter((n) => n === "avance").length,
    dansLesTemps: niveaux.filter((n) => n === "dans_les_temps").length,
    enRetard: niveaux.filter((n) => n === "retard" || n === "retard_fort").length,
  };
}
