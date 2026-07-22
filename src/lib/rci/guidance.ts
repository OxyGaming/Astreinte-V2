/**
 * RCI — guidage de saisie « quel champ pour quelle situation ».
 *
 * Un RCI ne se remplit jamais entièrement : selon la nature de l'événement
 * (heurt à un PN, accident de personne, déraillement…), une même rubrique est
 * tantôt indispensable, tantôt sans objet. Ce module encode la grille d'analyse
 * établie à partir de 7 RCI réels (St Romain, St Priest, KM 435.700, PANP2,
 * Portes, 886284, Vénissieux) pour que le wizard puisse dire à l'utilisateur,
 * champ par champ, ce qu'on attend de lui.
 *
 * Trois niveaux :
 *   - `required`    (✓ dans la grille) — attendu systématiquement
 *   - `conditional` (~ dans la grille) — à renseigner si l'info existe, ou
 *                    déjà porté par une autre rubrique (récit, schéma…)
 *   - `na`          (✗ dans la grille) — sans objet pour ce type d'événement
 *
 * Module pur (aucun I/O, aucun import React) : réutilisable côté serveur pour
 * un futur contrôle de complétude avant finalisation.
 */

import { CHECK_TERNARY_KEYS, type RciPayload, type RciPhotos } from "./fields";

// ─── Typologie d'événement ────────────────────────────────────────────────

export const RCI_EVENT_TYPES = [
  "collision_pn",
  "accident_personne",
  "franchissement",
  "deraillement_manoeuvre",
  "deraillement_ligne",
  "erreur_direction",
  "autre",
] as const;

export type RciEventType = (typeof RCI_EVENT_TYPES)[number];

export const RCI_EVENT_TYPE_LABELS: Record<RciEventType, string> = {
  collision_pn: "Collision / heurt à un PN",
  accident_personne: "Accident de personne",
  franchissement: "Franchissement de signal",
  deraillement_manoeuvre: "Déraillement en manœuvre",
  deraillement_ligne: "Déraillement en ligne",
  erreur_direction: "Erreur de direction / talonnage",
  autre: "Autre / à déterminer",
};

/** Exemple de RCI réel dont la colonne de la grille est issue — sert de repère. */
export const RCI_EVENT_TYPE_HINTS: Record<RciEventType, string> = {
  collision_pn: "ex. heurt d'un véhicule routier au PN",
  accident_personne: "heurt de personne, en ligne ou en gare",
  franchissement: "franchissement intempestif d'un signal d'arrêt",
  deraillement_manoeuvre: "déraillement d'un mouvement de manœuvre",
  deraillement_ligne: "déraillement d'un train en ligne",
  erreur_direction: "erreur d'itinéraire, talonnage d'aiguille",
  autre: "aucune grille type — tout est proposé",
};

/**
 * Ordre des colonnes dans les codes de la matrice ci-dessous.
 * `autre` est exclu : sa valeur est dérivée (cf. `requirementFor`).
 */
const MATRIX_ORDER = [
  "collision_pn",
  "accident_personne",
  "franchissement",
  "deraillement_manoeuvre",
  "deraillement_ligne",
  "erreur_direction",
] as const satisfies readonly RciEventType[];

/** Longueur attendue d'un code d'exigence (= nb de colonnes de la grille). */
export const MATRIX_CODE_LENGTH = MATRIX_ORDER.length;

// ─── Niveaux d'exigence ───────────────────────────────────────────────────

export type Requirement = "required" | "conditional" | "na";

const CODE_TO_REQUIREMENT: Record<string, Requirement> = {
  R: "required",
  C: "conditional",
  N: "na",
};

export const REQUIREMENT_LABELS: Record<Requirement, string> = {
  required: "Obligatoire",
  conditional: "Selon le cas",
  na: "Sans objet",
};

// ─── Groupes de champs ────────────────────────────────────────────────────

/** Étape du wizard portant le groupe — permet de renvoyer l'utilisateur au bon écran. */
export type RciStepKey =
  | "quand"
  | "nature"
  | "ou"
  | "installations"
  | "mobiles"
  | "qui"
  | "acteurs"
  | "presents"
  | "recit";

export type RciFieldGroup = {
  id: string;
  /** Libellé tel qu'il apparaît dans la grille d'analyse. */
  label: string;
  step: RciStepKey;
  /** Clés du payload couvertes par le groupe. */
  keys: readonly (keyof RciPayload)[];
  /** Photos couvertes (schéma succinct). */
  photoKeys?: readonly (keyof RciPhotos)[];
  /**
   * `any` (défaut) : le groupe est renseigné dès qu'une clé l'est.
   * `all` : toutes les clés doivent l'être (date + heure, parcours de → à…).
   */
  mode?: "any" | "all";
  /**
   * Code d'exigence, 1 caractère par colonne de `MATRIX_ORDER`
   * (R = ✓ requis, C = ~ conditionnel, N = ✗ sans objet).
   */
  code: string;
  /** Précision affichée quand le groupe est requis mais vide. */
  note?: string;
};

/**
 * Grille complète. L'ordre suit celui du RCI papier — c'est aussi l'ordre du
 * récapitulatif des manques affiché en tête du wizard.
 */
export const RCI_FIELD_GROUPS: readonly RciFieldGroup[] = [
  // ── En-tête / Quand ─────────────────────────────────────────────────────
  {
    id: "dossier",
    label: "N° de dossier (JJMMAAHHMM-lieu)",
    step: "quand",
    keys: ["dossier_numero"],
    code: "RRRRRR",
  },
  {
    id: "datetime",
    label: "Jour / date / heure de l'événement",
    step: "quand",
    keys: ["date_evenement", "heure_evenement"],
    mode: "all",
    code: "RRRRRR",
  },
  {
    id: "nature",
    label: "Nature de l'événement (« Quoi ? »)",
    step: "nature",
    keys: ["nature"],
    code: "RRRRRR",
  },

  // ── Où ? ────────────────────────────────────────────────────────────────
  {
    id: "gare",
    label: "Gare / gares encadrantes / poste",
    step: "ou",
    keys: ["gare_section"],
    code: "RRRRRR",
  },
  {
    id: "pk",
    label: "Point kilométrique (PK)",
    step: "ou",
    keys: ["point_km"],
    code: "RRNRRN",
    note: "Sans objet en zone de manœuvre / sur appareil de voie : le repère est l'aiguille.",
  },
  {
    id: "ligne_dpt",
    label: "N° de ligne + n° de département",
    step: "ou",
    keys: ["numero_ligne", "numero_dpt"],
    mode: "all",
    code: "RRRRRR",
  },
  {
    id: "type_voie",
    label: "Type de voie (VP / VS)",
    step: "ou",
    keys: ["type_voie", "type_voie_vp", "type_voie_vs"],
    code: "RRRRRR",
  },

  // ── Quoi ? (installations) ──────────────────────────────────────────────
  {
    id: "appareil_voie",
    label: "Appareil de voie (aiguille n°)",
    step: "installations",
    keys: ["appareil_voie"],
    code: "NNNCNR",
  },
  {
    id: "signal",
    label: "Signal / repère n°",
    step: "installations",
    keys: ["signal_repere"],
    code: "CNRNNN",
  },
  {
    id: "equip_signal",
    label: "Équipements du signal (KVB / TVM / DAAT / Crocodile)",
    step: "installations",
    keys: [
      "inst_kvb",
      "inst_tvm",
      "inst_daat",
      "inst_crocodile",
      "inst_etcs",
    ],
    code: "CNRNNN",
  },
  {
    id: "autre_equipement",
    label: "Autre équipement du signal (emplacement libre)",
    step: "installations",
    keys: ["inst_autre_libelle", "inst_autre_en_service"],
    // « Selon le cas » partout : la rubrique existe bien dans le formulaire
    // officiel, mais la grille d'analyse ne permet ni de la rendre obligatoire
    // ni de la rattacher à un type d'événement. Elle reste donc toujours
    // visible et accessible, sans jamais être comptée comme manque.
    code: "CCCCCC",
    note: "Ligne vierge du formulaire officiel, pour un équipement absent de la liste (KVB, TVM, DAAT, Crocodile, ETCS).",
  },
  {
    id: "detonateur",
    label: "Détonateur / cartouche percutée",
    step: "installations",
    keys: ["inst_detonateur", "inst_cartouche_percutee"],
    code: "NNRNNN",
  },
  {
    id: "pn",
    label: "PN n° + SAL2 / SAL4 + feux routiers",
    step: "installations",
    keys: ["pn_numero", "pn_sal2", "pn_sal4", "pn_autres", "pn_feux_routiers"],
    code: "RNNNNN",
  },

  // ── Quoi ? (mobiles) ────────────────────────────────────────────────────
  {
    id: "train",
    label: "N° de train + entreprise ferroviaire",
    step: "mobiles",
    keys: ["train_numero", "train_ef"],
    mode: "all",
    code: "RRRRRR",
  },
  {
    id: "loco",
    label: "Locomotive / automoteur n°",
    step: "mobiles",
    keys: ["train_locomotive_numero"],
    code: "RRRRRR",
  },
  {
    id: "cabine",
    label: "Équipements en service en cabine (KVB / RST / RS…)",
    step: "mobiles",
    keys: [
      "cab_kvb_covit",
      "cab_daat",
      "cab_rst",
      "cab_gsm_gfu",
      "cab_rs",
      "cab_etcs",
      "cab_tvm",
    ],
    code: "CRRRRR",
  },
  {
    id: "compo",
    label: "Composition (compo / nb / longueur / masses)",
    step: "mobiles",
    keys: [
      "compo_code",
      "compo_nb_vehicules",
      "compo_longueur",
      "compo_masse",
    ],
    code: "RRRRRR",
  },
  {
    id: "parcours",
    label: "Parcours (de → à)",
    step: "mobiles",
    keys: ["parcours_de", "parcours_a"],
    mode: "all",
    code: "RRRRRR",
  },
  {
    id: "vitesse",
    label: "Vitesse au moment de l'événement",
    step: "mobiles",
    keys: ["vitesse_evenement"],
    code: "RRRRCR",
  },
  {
    id: "vehicules",
    label: "Véhicules accidentés (n° / masses / tampons)",
    step: "mobiles",
    keys: ["veh_nombre", "veh_numero", "veh_masse_rail", "veh_position_freinage"],
    code: "NNNRNN",
  },
  {
    id: "relevage",
    label: "Besoin d'un moyen de relevage",
    step: "mobiles",
    keys: ["veh_besoin_relevage"],
    code: "NNNRRN",
    note: "Conditionne l'engagement des moyens de relevage — à trancher même si la réponse est « non ».",
  },

  // ── Qui ? ───────────────────────────────────────────────────────────────
  {
    id: "sgc",
    label: "SNCF Réseau / SGC",
    step: "qui",
    keys: ["qui_sgc", "qui_maintenance_travaux_mainteneur"],
    code: "RRRRRR",
  },
  {
    id: "ef1",
    label: "EF n°1 (nom)",
    step: "qui",
    keys: ["ef1_nom"],
    code: "RRRRRR",
  },
  {
    id: "ef2",
    label: "EF n°2 (nom)",
    step: "recit",
    keys: ["sig_ef2_nom_fonction", "sig_ef2_etablissement"],
    code: "NRNNNN",
    note: "Le modèle Word n'a pas de bloc « Qui ? EF n°2 » : la 2ᵉ EF se renseigne dans « Présents sur place » et le tableau des signatures.",
  },
  {
    id: "autres_gi",
    label: "Autres GI / délégataires",
    step: "qui",
    keys: ["autres_gi_nom", "autres_gi_delegataire", "autres_gi_titulaire"],
    code: "NNNNNN",
  },
  {
    id: "nb_cabine",
    label: "Nombre de personnes en cabine (v08+)",
    step: "qui",
    keys: ["qui_nb_personnes_cabine"],
    code: "NCNNNN",
  },
  {
    id: "contexte_conduite",
    label: "Contexte de conduite (conducteur seul / pilote / PAM / opérations au sol)",
    step: "qui",
    keys: [
      "qui_conducteur_seul_reseau",
      "qui_conducteur_seul_prestataire",
      "qui_conducteur_seul_conduite",
      "qui_conducteur_seul_nom",
      "qui_pilote_reseau",
      "qui_pilote_prestataire",
      "qui_pilote_conduite",
      "qui_pilote_nom",
      "qui_pam_reseau",
      "qui_pam_prestataire",
      "qui_pam_conduite",
      "qui_pam_nom",
      "qui_ops_sol_reseau",
      "qui_ops_sol_prestataire",
      "qui_ops_sol_conduite",
      "qui_ops_sol_nom",
    ],
    // La grille d'analyse des 7 RCI de référence ne comporte pas de ligne pour
    // ce bloc (ajout v08+, comme le nombre de personnes en cabine) : on le
    // laisse « selon le cas » partout plutôt que d'inventer une exigence.
    code: "CCCCCC",
    note: "Bloc v08+ du RCI. Niveau d'exigence non couvert par la grille d'analyse des 7 RCI de référence — à arbitrer.",
  },

  // ── Personnes / alcoolémie ──────────────────────────────────────────────
  {
    id: "alcool",
    label: "Mesures d'alcoolémie (personne + pratiqué)",
    step: "acteurs",
    keys: ["alcool_personne", "alcool_pratique"],
    mode: "all",
    code: "RRRRRR",
  },
  {
    id: "alcool_positif",
    label: "Résultat alcoolémie (positif oui / non)",
    step: "acteurs",
    keys: ["alcool_positif"],
    code: "CRRCRC",
  },
  {
    id: "accident_personne",
    label: "Bloc « accident de personnes / personnel »",
    step: "acteurs",
    keys: ["ap_blesse", "ap_deces", "ap_suicide_presume", "ap_source"],
    code: "NRNNRN",
  },

  // ── Mesures & déroulé ───────────────────────────────────────────────────
  {
    id: "mesures_conservatoires",
    label: "Mesures conservatoires (heure / qui / mesures)",
    step: "acteurs",
    keys: ["mc_l1_heure", "mc_l1_par_qui", "mc_l1_mesures"],
    code: "NRRRNR",
  },
  {
    id: "consequences",
    label: "Conséquences visibles",
    step: "recit",
    keys: ["consequences_visibles"],
    code: "RRRRRR",
  },
  {
    id: "recit",
    label: "Déroulé chronologique horodaté + hypothèses",
    step: "recit",
    keys: ["recit_chronologique"],
    code: "RRRRRR",
    note: "La liste des hypothèses n'a pas de cadre dédié dans le modèle : elle se termine en fin de récit.",
  },
  {
    id: "acteurs",
    label: "Identification des acteurs principaux",
    step: "acteurs",
    keys: ["acteur_l1_entreprise", "acteur_l1_fonction", "acteur_l1_nom"],
    code: "RRRRRR",
  },

  // ── Personnes & organismes appelés ──────────────────────────────────────
  {
    id: "po_reseau",
    label: "Représentants SNCF Réseau (astreinte Circulation)",
    step: "presents",
    keys: [
      "po_dpx_heure_avis",
      "po_dpx_present",
      "po_utm_heure_avis",
      "po_utm_present",
      "po_reg_heure_avis",
      "po_reg_present",
    ],
    code: "RRRRRR",
  },
  {
    id: "po_externes",
    label: "Intervenants externes (police / pompiers / pompes funèbres)",
    step: "presents",
    keys: [
      "po_police_heure_avis",
      "po_police_present",
      "po_pompiers_heure_avis",
      "po_pompiers_present",
      "po_funebres_present",
      "po_autres_present",
    ],
    code: "RRNNRN",
  },
  {
    id: "po_exploitants",
    label: "Représentants des exploitants (EF)",
    step: "presents",
    keys: [
      "po_ef1_heure_avis",
      "po_ef1_present",
      "po_ef2_heure_avis",
      "po_ef2_present",
    ],
    code: "RRRRRR",
  },
  {
    id: "po_suge",
    label: "Représentant SUGE",
    step: "presents",
    keys: ["po_suge_heure_avis", "po_suge_present"],
    code: "NRNNRN",
  },
  {
    id: "po_autres_gi",
    label: "Représentants des autres GI",
    step: "presents",
    keys: [
      "po_titulaire_heure_avis",
      "po_titulaire_present",
      "po_delegataire_heure_avis",
      "po_delegataire_present",
    ],
    code: "NNNNNN",
  },

  // ── Clôture ─────────────────────────────────────────────────────────────
  {
    id: "schema",
    label: "Schéma succinct",
    step: "recit",
    keys: [],
    photoKeys: ["schema_succinct"],
    code: "RRNRNN",
  },
  {
    id: "point_protege",
    label: "« Point protégé engagé ? » (franchissement)",
    step: "recit",
    keys: ["franchissement_point_protege_engage"],
    code: "CNRNNN",
  },
  {
    id: "photos",
    label: "Photos jointes / titres d'habilitation",
    step: "recit",
    keys: ["photos_jointes", "photos_titres_habilitation"],
    code: "CRNCNN",
  },
  {
    id: "etabli",
    label: "RCI établi le / par + tableau des signatures",
    step: "recit",
    keys: ["rci_etabli_le", "rci_etabli_par", "sig_eic_nom_fonction"],
    mode: "all",
    code: "RRRRRR",
  },
];

const GROUPS_BY_ID = new Map(RCI_FIELD_GROUPS.map((g) => [g.id, g]));

/** Clé du payload → étape du wizard qui la porte. */
const STEP_BY_KEY = new Map<string, RciStepKey>();
for (const g of RCI_FIELD_GROUPS) {
  for (const k of g.keys) if (!STEP_BY_KEY.has(k)) STEP_BY_KEY.set(k, g.step);
}

/**
 * Champs qu'aucun groupe de la grille ne couvre — la grille décrit des
 * rubriques d'exigence, pas la totalité du formulaire. Les rattacher à leur
 * étape réelle évite d'envoyer l'agent vérifier « Jour de la semaine » à
 * l'étape « Récit ».
 */
const ETAPES_HORS_GRILLE: Record<string, RciStepKey> = {
  event_type: "nature",
  jour_semaine: "quand",
  numero_voie: "ou",
  autres_installations: "installations",
  rci_etabli_le: "recit",
  rci_etabli_par: "recit",
};

/**
 * Étape où se saisit un champ — sert à regrouper les propositions de reprise
 * là où l'utilisateur ira les vérifier.
 */
export function etapeDeLaCle(cle: keyof RciPayload): RciStepKey {
  const s = cle as string;
  const explicite = ETAPES_HORS_GRILLE[s];
  if (explicite) return explicite;
  const direct = STEP_BY_KEY.get(s);
  if (direct) return direct;
  if (s.startsWith("po_")) return "presents";
  if (s.startsWith("mc_")) return "acteurs";
  if (s.startsWith("veh_")) return "mobiles";
  if (s.startsWith("cab_") || s.startsWith("train_")) return "mobiles";
  if (s.startsWith("inst_") || s.startsWith("pn_")) return "installations";
  if (s.startsWith("qui_") || s.startsWith("ef") || s.startsWith("autres_gi"))
    return "qui";
  if (s.startsWith("alcool_") || s.startsWith("ap_")) return "acteurs";
  // Signatures et champs de clôture : dernière étape, celle de la relecture.
  return "recit";
}

// ─── Résolution de l'exigence ─────────────────────────────────────────────

/**
 * Exigence d'un groupe pour un type d'événement donné.
 *
 * `autre` n'a pas de colonne : on retient le niveau commun à toutes les
 * situations connues (une rubrique universelle reste obligatoire, une rubrique
 * universellement sans objet reste sans objet) et on retombe sinon sur
 * « selon le cas » plutôt que d'imposer ou de masquer à tort.
 */
export function requirementFor(
  group: RciFieldGroup,
  eventType: RciEventType,
): Requirement {
  if (eventType === "autre") {
    const first = group.code[0];
    return group.code.split("").every((c) => c === first)
      ? (CODE_TO_REQUIREMENT[first] ?? "conditional")
      : "conditional";
  }
  const idx = MATRIX_ORDER.indexOf(eventType as (typeof MATRIX_ORDER)[number]);
  if (idx < 0) return "conditional";
  return CODE_TO_REQUIREMENT[group.code[idx]] ?? "conditional";
}

/** Exigence par identifiant de groupe — pratique côté composants. */
export function requirementOf(
  groupId: string,
  eventType: RciEventType,
): Requirement {
  const g = GROUPS_BY_ID.get(groupId);
  return g ? requirementFor(g, eventType) : "conditional";
}

// ─── Complétude ───────────────────────────────────────────────────────────

const TERNARY_SET = new Set<string>(CHECK_TERNARY_KEYS as readonly string[]);

/**
 * Une clé compte comme renseignée si elle porte une information.
 *
 * La nuance est dans les booléens : un ternaire répondu « non » est une
 * constatation (on a vérifié, il n'y a pas besoin de relevage), alors qu'une
 * case à cocher décochée est simplement l'état par défaut du formulaire — elle
 * ne prouve rien. D'où la distinction sur `CHECK_TERNARY_KEYS`.
 */
export function isKeyFilled(key: keyof RciPayload, payload: RciPayload): boolean {
  const value = payload[key];
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") {
    return TERNARY_SET.has(key as string) ? true : value;
  }
  return true;
}

export function isGroupFilled(
  group: RciFieldGroup,
  payload: RciPayload,
  photos: RciPhotos = {},
): boolean {
  const flags = group.keys.map((k) => isKeyFilled(k, payload));
  for (const pk of group.photoKeys ?? []) {
    const v = photos[pk];
    flags.push(typeof v === "string" && v.length > 0);
  }
  if (flags.length === 0) return false;
  return group.mode === "all"
    ? flags.every(Boolean)
    : flags.some(Boolean);
}

export type RciGap = {
  group: RciFieldGroup;
  requirement: Requirement;
};

/**
 * Groupes attendus (obligatoires) encore vides, dans l'ordre du RCI papier.
 * C'est ce que le wizard affiche en tête et par étape.
 */
export function missingRequired(
  payload: RciPayload,
  photos: RciPhotos,
  eventType: RciEventType,
): RciGap[] {
  const out: RciGap[] = [];
  for (const group of RCI_FIELD_GROUPS) {
    const requirement = requirementFor(group, eventType);
    if (requirement !== "required") continue;
    if (isGroupFilled(group, payload, photos)) continue;
    out.push({ group, requirement });
  }
  return out;
}

/** Nombre de manques obligatoires par étape — pastilles du stepper. */
export function missingByStep(
  payload: RciPayload,
  photos: RciPhotos,
  eventType: RciEventType,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { group } of missingRequired(payload, photos, eventType)) {
    out[group.step] = (out[group.step] ?? 0) + 1;
  }
  return out;
}

/** Type d'événement stocké dans le payload, avec repli sûr. */
export function normalizeEventType(value: unknown): RciEventType {
  return RCI_EVENT_TYPES.includes(value as RciEventType)
    ? (value as RciEventType)
    : "autre";
}
