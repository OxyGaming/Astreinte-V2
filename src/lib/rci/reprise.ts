/**
 * RCI — reprise des données déjà saisies sur le terrain.
 *
 * Un même événement est décrit par trois modules à des moments différents :
 * la session de fiche réflexe pendant l'action, le Livret CIL pendant la
 * gestion sur site, le RCI après coup. Ce module traduit les deux premiers en
 * une proposition de pré-remplissage du RCI.
 *
 * PRINCIPES
 *  - **Proposition, jamais imposition.** Le résultat est une liste de
 *    propositions **par champ**, chacune portant sa provenance. L'agent accepte
 *    ou écarte champ par champ (cf. `accepter`) : rien ne s'applique en bloc.
 *  - **Sources cumulables.** Un RCI peut être rattaché à la fois à une session
 *    et à un Livret CIL ; deux propositions peuvent viser le même champ, à
 *    charge pour l'agent de choisir laquelle retenir.
 *  - **Pur.** Aucune I/O, aucun accès Prisma : les données sont passées en
 *    entrée sous une forme minimale. Rend le module testable et réutilisable
 *    côté serveur comme client.
 *  - **Périmètre 1re partie.** Les reprises de circulation et rétablissements de
 *    tension du CIL relèvent de la 2e partie du RCI, hors périmètre : ils sont
 *    volontairement ignorés (cf. [[rci-template-balisage]]).
 *  - **Pas d'invention.** Ce que la source ne dit pas reste vide ; on ne déduit
 *    ni la vitesse, ni la composition, ni l'alcoolémie — elles viennent du
 *    conducteur et de l'EF.
 */

import type { RciPayload } from "./fields";
import {
  etapeDeLaCle,
  isKeyFilled,
  type RciEventType,
  type RciStepKey,
} from "./guidance";

// ─── Formes minimales attendues en entrée ────────────────────────────────
// Volontairement structurelles (et non les types Prisma) : le module reste
// utilisable depuis un test, un script ou une future API sans dépendance ORM.

export type CilIncidentInput = {
  id: string;
  reference: string | null;
  type: string;
  typeLibre: string | null;
  occurredAt: string;
  lieu: string;
  poste: string | null;
  voie: string | null;
  voies: string | null;
  km: string | null;
  observations: string | null;
  gareMode: string | null;
  gareUnique: string | null;
  gareA: string | null;
  gareB: string | null;
  cilNom: string | null;
  cilPrenom: string | null;
  cilEtablissement: string | null;
  arrivedOnSiteAt: string | null;
};

export type CilEventInput = {
  type: string;
  occurredAt: string;
  seq: number;
  label: string;
  note: string | null;
  actorName: string | null;
};

export type CilIntervenantInput = {
  type: string;
  typeLibre: string | null;
  nom: string | null;
  tel: string | null;
  arrivedAt: string | null;
};


export type SessionInput = {
  id: string;
  ficheSlug: string;
  ficheTitre: string;
  startedAt: string;
  endedAt: string | null;
  createdByName: string | null;
};

export type SessionLogInput = {
  timestamp: string;
  /** Libellé de l'action cochée, ou message du commentaire. */
  texte: string;
  auteur: string | null;
  /** `action` = case cochée dans la fiche ; `commentaire` = note libre. */
  genre: "action" | "commentaire";
};

/** Famille de source terrain. */
export type SourceGenre = "cil" | "session";

/**
 * Une valeur proposée pour UN champ, avec sa provenance.
 *
 * La reprise est acceptée champ par champ : l'agent voit ce qu'on lui propose,
 * d'où ça vient, et ce que ça remplacerait. Rien ne s'applique sans son accord
 * — un RCI est cosigné, la provenance de chaque donnée doit être assumée.
 */
export type PropositionChamp = {
  cle: keyof RciPayload;
  valeur: string | boolean;
  /** Libellé lisible du champ (celui du RCI papier). */
  libelle: string;
  /** Étape du wizard où le champ se saisit — regroupe l'écran de reprise. */
  etape: RciStepKey;
  source: SourceGenre;
};

export type RepriseResult = {
  propositions: PropositionChamp[];
};

/**
 * Propositions d'un même champ, rassemblées pour l'arbitrage.
 *
 * `options` porte les valeurs **distinctes** proposées : une seule quand les
 * sources s'accordent (ou qu'il n'y en a qu'une), plusieurs quand elles
 * divergent — auquel cas l'agent doit trancher explicitement.
 */
export type GroupeProposition = {
  cle: keyof RciPayload;
  libelle: string;
  etape: RciStepKey;
  options: { valeur: string | boolean; sources: SourceGenre[] }[];
};

/** Le champ reçoit-il des valeurs contradictoires ? */
export const estDivergent = (g: GroupeProposition) => g.options.length > 1;

/**
 * Regroupe les propositions par champ et déduplique les valeurs identiques.
 *
 * Deux sources qui disent la même chose ne posent aucune question : elles se
 * fondent en une seule option créditée aux deux. Deux sources qui divergent
 * produisent deux options, et c'est à l'agent de choisir — l'application n'a
 * aucune raison légitime de préférer l'une à l'autre.
 *
 * L'ordre d'apparition est conservé : le premier champ proposé reste le premier
 * affiché, et la première valeur rencontrée reste la première option.
 */
export function grouperPropositions(
  propositions: PropositionChamp[],
): GroupeProposition[] {
  const parCle = new Map<string, GroupeProposition>();
  for (const p of propositions) {
    const cle = p.cle as string;
    let g = parCle.get(cle);
    if (!g) {
      g = { cle: p.cle, libelle: p.libelle, etape: p.etape, options: [] };
      parCle.set(cle, g);
    }
    const existante = g.options.find((o) => o.valeur === p.valeur);
    if (existante) {
      if (!existante.sources.includes(p.source)) existante.sources.push(p.source);
    } else {
      g.options.push({ valeur: p.valeur, sources: [p.source] });
    }
  }
  return [...parCle.values()];
}

/**
 * Libellés des champs susceptibles d'être proposés, repris du RCI papier.
 *
 * Limité aux clés que `depuisCil` / `depuisSession` savent alimenter : un
 * libellé manquant signale une proposition non prévue, que `enProposition`
 * ignore plutôt que d'afficher une clé technique à l'agent.
 */
const LIBELLES_CHAMPS: Partial<Record<keyof RciPayload, string>> = {
  dossier_numero: "N° de dossier",
  date_evenement: "Date de l'événement",
  heure_evenement: "Heure de l'événement",
  jour_semaine: "Jour de la semaine",
  nature: "Nature de l'événement",
  event_type: "Type d'événement",
  gare_section: "Gare / gares encadrantes / poste",
  point_km: "Point kilométrique",
  numero_voie: "N° de voie",
  recit_chronologique: "Déroulé chronologique",
  rci_etabli_par: "RCI établi par",
  po_dpx_present: "Présent — astreinte Circulation",
  po_dpx_heure_arrivee: "Heure d'arrivée — astreinte Circulation",
  po_utm_present: "Présent — dirigeant d'UTM",
  po_utm_heure_arrivee: "Heure d'arrivée — dirigeant d'UTM",
  po_police_present: "Présent — police / gendarmerie",
  po_police_heure_arrivee: "Heure d'arrivée — police / gendarmerie",
  po_pompiers_present: "Présent — pompiers",
  po_pompiers_heure_arrivee: "Heure d'arrivée — pompiers",
  po_funebres_present: "Présent — pompes funèbres",
  po_funebres_heure_arrivee: "Heure d'arrivée — pompes funèbres",
  po_ef1_present: "Présent — EF n°1",
  po_ef1_heure_arrivee: "Heure d'arrivée — EF n°1",
  po_autres_label: "Autres intervenants — libellé",
  po_autres_present: "Présent — autres intervenants",
  po_autres_heure_arrivee: "Heure d'arrivée — autres intervenants",
  sig_sncf2_nom_fonction: "Signataire SNCF Réseau — nom / fonction",
  sig_sncf2_etablissement: "Signataire SNCF Réseau — établissement",
};

/**
 * Traduit les valeurs collectées en propositions présentables.
 * Les clés sans libellé connu sont écartées : mieux vaut ne rien proposer
 * qu'afficher `po_convois_heure_avis` à un agent.
 */
function enPropositions(
  valeurs: Partial<RciPayload>,
  source: SourceGenre,
): PropositionChamp[] {
  const out: PropositionChamp[] = [];
  for (const [k, valeur] of Object.entries(valeurs)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    const cle = k as keyof RciPayload;
    const libelle = LIBELLES_CHAMPS[cle];
    if (!libelle) continue;
    out.push({
      cle,
      valeur: valeur as string | boolean,
      libelle,
      etape: etapeDeLaCle(cle),
      source,
    });
  }
  return out;
}

// ─── Utilitaires de format ───────────────────────────────────────────────

const p2 = (n: number) => String(n).padStart(2, "0");

/** ISO → `JJ/MM/AAAA` (format payload/Word). */
export function isoToDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** ISO → `HhMM` sans zéro de tête (format payload/Word). */
export function isoToHeureFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours()}h${p2(d.getMinutes())}`;
}

const JOURS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

/** ISO → jour de la semaine en français. */
export function isoToJourFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return JOURS[(d.getDay() + 6) % 7];
}

/** Une ligne de récit : `HHhMM  texte`. */
function ligneRecit(iso: string, texte: string, auteur?: string | null): string {
  const h = isoToHeureFr(iso).padStart(5, " ");
  const qui = auteur ? ` (${auteur})` : "";
  return `${h}  ${texte}${qui}`;
}

// ─── Correspondances CIL → RCI ───────────────────────────────────────────

/**
 * Intervenant CIL → préfixe de ligne du tableau « Présents sur place » du RCI.
 * `null` quand aucune ligne du RCI ne correspond : on retombe alors sur la
 * ligne libre « Autres (à préciser) ».
 */
export function ligneIntervenant(type: string): string | null {
  switch (type) {
    case "OPJ":
      return "police";
    case "COS":
      return "pompiers";
    case "POMPES_FUNEBRES":
      return "funebres";
    case "EIC":
      return "dpx";
    case "INFP":
      return "utm";
    case "EXF_TRACTION":
    case "EXF_VOYAGEURS":
      return "ef1";
    default:
      return null;
  }
}

/** Localisation officielle du CIL → libellé « Gare / gares encadrantes ». */
export function libelleGares(inc: CilIncidentInput): string {
  if (inc.gareMode === "BETWEEN" && (inc.gareA || inc.gareB)) {
    return `entre les gares de ${inc.gareA ?? "…"} et de ${inc.gareB ?? "…"}`;
  }
  if (inc.gareMode === "UNIQUE" && inc.gareUnique) {
    return `en gare de ${inc.gareUnique}`;
  }
  return "";
}

/** Assemble le libellé de localisation : lieu, gares, poste. */
function localisation(inc: CilIncidentInput): string {
  return [inc.lieu, libelleGares(inc), inc.poste ? `poste ${inc.poste}` : ""]
    .filter((s) => s && s.trim())
    .join(" — ");
}

// ─── Reprise depuis le Livret CIL ────────────────────────────────────────

export function depuisCil(
  inc: CilIncidentInput,
  events: CilEventInput[] = [],
  intervenants: CilIntervenantInput[] = [],
  /** Typologie tranchée par l'utilisateur quand la source est ambiguë. */
  typologieChoisie?: RciEventType,
): RepriseResult {
  const v: Partial<RciPayload> = {};

  // ── Quand / n° de dossier ──────────────────────────────────────────────
  if (inc.reference) {
    // Même format normé JJMMAAHHMM-Lieu des deux côtés.
    v.dossier_numero = inc.reference;
  }
  const date = isoToDateFr(inc.occurredAt);
  if (date) {
    v.date_evenement = date;
    v.heure_evenement = isoToHeureFr(inc.occurredAt);
    v.jour_semaine = isoToJourFr(inc.occurredAt);
  }

  // ── Nature / typologie ─────────────────────────────────────────────────
  const nature = inc.typeLibre?.trim() || LIBELLES_INCIDENT[inc.type] || "";
  if (nature) {
    v.nature = nature;
  }
  const t = typologieRetenue(correspondanceCil(inc.type), typologieChoisie);
  if (t) {
    v.event_type = t;
  }

  // ── Où ─────────────────────────────────────────────────────────────────
  const lieu = localisation(inc);
  if (lieu) {
    v.gare_section = lieu;
  }
  if (inc.km) {
    v.point_km = inc.km;
  }
  const voie = inc.voie?.trim() || inc.voies?.trim() || "";
  if (voie) {
    v.numero_voie = voie;
  }

  // `CilIncident.observations` n'est pas repris en « conséquences visibles » :
  // c'est un champ libre du livret, qui peut contenir tout autre chose.

  // ── Déroulé chronologique ──────────────────────────────────────────────
  // Les reprises/rétablissements relèvent de la 2e partie du RCI : exclus.
  const HORS_PERIMETRE = new Set([
    "REPRISE_PARTIELLE_CIRCULATION",
    "REPRISE_CIRCULATION",
    "RETABLISSEMENT_PARTIEL_TENSION",
    "RETABLISSEMENT_TENSION",
  ]);
  const lignes = [...events]
    .filter((e) => !HORS_PERIMETRE.has(e.type))
    .sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() ||
        a.seq - b.seq,
    )
    .map((e) =>
      ligneRecit(
        e.occurredAt,
        [e.label, e.note?.trim()].filter(Boolean).join(" — "),
        e.actorName,
      ),
    );
  if (lignes.length) {
    v.recit_chronologique = lignes.join("\n");
  }

  // Les dépêches de protection du CIL ne sont PAS reprises en mesures
  // conservatoires : une protection est une mesure d'exploitation prise pour
  // sécuriser la zone, là où la « mesure conservatoire » du RCI vise à figer
  // l'état des lieux pour l'enquête. Les assimiler fausserait le document.

  // ── Présents sur place ─────────────────────────────────────────────────
  let autresUtilise = false;
  let nbIntervenants = 0;
  for (const it of intervenants) {
    let ligne = ligneIntervenant(it.type);
    if (!ligne) {
      // Une seule ligne libre dans le RCI : le premier intervenant hors
      // nomenclature la prend, les suivants sont laissés à la saisie manuelle.
      if (autresUtilise) continue;
      autresUtilise = true;
      ligne = "autres";
      (v as Record<string, unknown>).po_autres_label =
        it.typeLibre?.trim() || it.nom || "Autre intervenant";
    }
    const rec = v as Record<string, unknown>;
    rec[`po_${ligne}_present`] = true;
    if (it.arrivedAt) {
      rec[`po_${ligne}_heure_arrivee`] = isoToHeureFr(it.arrivedAt);
    }
    nbIntervenants++;
  }
  // Le CIL lui-même est arrivé sur site : c'est un représentant SNCF Réseau.
  if (inc.arrivedOnSiteAt) {
    v.po_dpx_present = true;
    v.po_dpx_heure_arrivee = isoToHeureFr(inc.arrivedOnSiteAt);
  }

  // ── Le CIL comme signataire SNCF Réseau supplémentaire ─────────────────
  const cilNom = [inc.cilPrenom, inc.cilNom].filter(Boolean).join(" ").trim();
  if (cilNom) {
    // Le sous-rôle n'est pas imposé : c'est à l'agent de qualifier sous quel
    // titre le CIL cosigne le RCI.
    v.sig_sncf2_nom_fonction = cilNom;
    if (inc.cilEtablissement) {
      v.sig_sncf2_etablissement =
        ETABLISSEMENTS_CIL[inc.cilEtablissement] ?? inc.cilEtablissement;
    }
  }

  return { propositions: enPropositions(v, "cil") };
}

const LIBELLES_INCIDENT: Record<string, string> = {
  INCENDIE: "Incendie",
  ACCIDENT_PERSONNE: "Accident de personne",
  OBSTACLE: "Obstacle",
  AUTRE: "",
};

const ETABLISSEMENTS_CIL: Record<string, string> = {
  EIC_RAL: "EIC RAL",
  INFP_RHN: "INFP RHN",
  INFP_LGV: "INFP LGV",
};

// ─── Reprise depuis une session de fiche réflexe ─────────────────────────

export function depuisSession(
  session: SessionInput,
  logs: SessionLogInput[] = [],
  /** Typologie tranchée par l'utilisateur quand la fiche est ambiguë. */
  typologieChoisie?: RciEventType,
): RepriseResult {
  const v: Partial<RciPayload> = {};

  const date = isoToDateFr(session.startedAt);
  if (date) {
    v.date_evenement = date;
    v.heure_evenement = isoToHeureFr(session.startedAt);
    v.jour_semaine = isoToJourFr(session.startedAt);
  }

  if (session.ficheTitre?.trim()) {
    v.nature = session.ficheTitre.trim();
  }
  // Ambiguë et non tranchée : on ne propose rien plutôt que de deviner — la
  // typologie du RCI reste « autre » jusqu'au choix de l'agent.
  const t = typologieRetenue(
    correspondanceFiche(session.ficheSlug),
    typologieChoisie,
  );
  if (t) {
    v.event_type = t;
  }

  const lignes = [...logs]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((l) =>
      ligneRecit(
        l.timestamp,
        l.genre === "commentaire" ? `[note] ${l.texte}` : l.texte,
        l.auteur,
      ),
    );
  if (lignes.length) {
    v.recit_chronologique = lignes.join("\n");
  }

  if (session.createdByName?.trim()) {
    v.rci_etabli_par = session.createdByName.trim();
  }

  return { propositions: enPropositions(v, "session") };
}

/**
 * Correspondance entre une source terrain et la typologie d'événement du RCI.
 *
 * Trois cas, et un seul comportement par cas :
 *  - `certaine` : une fiche ne peut donner qu'une situation → sélection auto ;
 *  - `ambigue`  : la fiche couvre plusieurs situations → l'utilisateur tranche
 *                 au moment du rattachement ;
 *  - `aucune`   : rien de pertinent → la typologie reste « autre ».
 */
export type CorrespondanceTypologie =
  | { genre: "certaine"; typologie: RciEventType }
  | { genre: "ambigue"; choix: RciEventType[] }
  | { genre: "aucune" };

/**
 * Table explicite slug de fiche → typologies RCI possibles.
 *
 * Volontairement exhaustive plutôt que lexicale : un rapprochement par
 * sous-chaîne ferait passer « derangement-pn » (dérangement d'un PN) pour une
 * collision à un PN, ce qui est faux. Une fiche absente de la table n'a pas de
 * correspondance — c'est le cas courant (colis suspect, alerte météo…).
 */
const TYPOLOGIES_PAR_FICHE: Record<string, RciEventType[]> = {
  "accident-personne": ["accident_personne"],
  "accident-pn": ["collision_pn"],
  "franchissement-signal": ["franchissement"],
  // « Déraillement / Talonnage / Bi-voie » recouvre trois situations que le RCI
  // distingue : déraillement en ligne, en manœuvre, et talonnage (= erreur de
  // direction). La fiche ne permet pas de trancher, l'agent si.
  deraillement: [
    "deraillement_ligne",
    "deraillement_manoeuvre",
    "erreur_direction",
  ],
  // Une personne sur la voie ne devient un accident de personne que s'il y a
  // eu heurt : à confirmer.
  "personne-voie": ["accident_personne"],
};

export function correspondanceFiche(slug: string): CorrespondanceTypologie {
  const candidats = TYPOLOGIES_PAR_FICHE[(slug || "").toLowerCase()];
  if (!candidats || candidats.length === 0) return { genre: "aucune" };
  if (candidats.length === 1) {
    return { genre: "certaine", typologie: candidats[0] };
  }
  // « autre » est toujours proposé en dernier recours : l'agent ne doit jamais
  // être contraint de choisir une situation qui ne correspond pas.
  return { genre: "ambigue", choix: [...candidats, "autre"] };
}

/** Idem depuis un incident du Livret CIL. */
export function correspondanceCil(type: string): CorrespondanceTypologie {
  // Le CIL ne décrit ni déraillement ni franchissement : seule la ligne
  // « accident de personne » a un équivalent certain.
  if (type === "ACCIDENT_PERSONNE") {
    return { genre: "certaine", typologie: "accident_personne" };
  }
  return { genre: "aucune" };
}

/**
 * Typologie retenue pour une correspondance, ou `undefined` s'il faut demander
 * à l'utilisateur (cas ambigu non tranché).
 */
function typologieRetenue(
  c: CorrespondanceTypologie,
  choix?: RciEventType,
): RciEventType | undefined {
  if (choix) return choix;
  return c.genre === "certaine" ? c.typologie : undefined;
}

// ─── Acceptation champ par champ ─────────────────────────────────────────

/**
 * Le champ est-il encore « à pourvoir » ?
 *
 * Sert à distinguer, dans l'écran de reprise, ce qui comble un vide de ce qui
 * remplacerait une saisie. `isKeyFilled` porte la nuance essentielle : sur un
 * ternaire, « non » est une constatation (donc renseigné), alors qu'une case
 * décochée ne dit rien.
 */
export function champVide(actuel: RciPayload, cle: keyof RciPayload): boolean {
  // Tant que la typologie vaut « autre », rien n'a été choisi.
  if (cle === "event_type") {
    return !actuel.event_type || actuel.event_type === "autre";
  }
  return !isKeyFilled(cle, actuel);
}

/**
 * Écarte les propositions sans intérêt : celles dont la valeur est déjà en
 * place. On conserve en revanche celles qui remplaceraient une saisie
 * différente — c'est à l'agent de trancher, en connaissance de cause.
 */
export function propositionsUtiles(
  actuel: RciPayload,
  propositions: PropositionChamp[],
): PropositionChamp[] {
  return propositions.filter(
    (p) => (actuel as Record<string, unknown>)[p.cle as string] !== p.valeur,
  );
}

/** Applique UNE proposition, sur décision explicite de l'agent. */
export function accepter(
  actuel: RciPayload,
  // Signature minimale : accepte aussi bien une proposition brute que l'option
  // retenue dans un groupe divergent.
  retenu: Pick<PropositionChamp, "cle" | "valeur">,
): RciPayload {
  return {
    ...actuel,
    [retenu.cle]: retenu.valeur,
  } as RciPayload;
}
