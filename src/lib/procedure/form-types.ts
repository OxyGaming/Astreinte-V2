/**
 * Types + validation + utils pour l'éditeur de procédures back-office.
 * Séparé de types.ts (runtime) pour ne pas polluer le moteur.
 */
import type { TypeAction, NiveauAction, TypeProcedure } from "./types";

// ─── Form model ──────────────────────────────────────────────────────────────

export type ProcedureForm = {
  id?: string;
  slug: string;
  titre: string;
  typeProcedure: TypeProcedure;
  description: string;
  version: string;
  etapes: EtapeForm[];
  posteIds: string[];
};

export type EtapeForm = {
  _key: string;        // UUID local React, jamais persisté
  id: string;          // Stable après création (ex: "e1", "e2"…)
  titre: string;
  description: string; // Ajout v2
  icone: string;
  actions: ActionForm[];
};

export type ActionForm = {
  _key: string;        // UUID local React, jamais persisté
  id: string;          // Stable après création (slugifié depuis label)
  type: TypeAction;
  label: string;
  description: string;
  note: string;
  niveau: NiveauAction;
  obligatoire: boolean;
  verifiable: boolean;
  reponseAttendue: string | boolean | null; // Unifié — interprété selon type
  reponsesDisponibles: string[];            // question_choix uniquement
  contactId: string;
  referenceDoc: string;
};

export type ValidationError = { field: string; message: string };

// ─── Options ──────────────────────────────────────────────────────────────────

export const TYPE_PROCEDURE_OPTIONS: { value: TypeProcedure; label: string }[] = [
  { value: "cessation", label: "Cessation de service" },
  { value: "reprise", label: "Reprise de service" },
  { value: "incident", label: "Gestion d'incident" },
  { value: "travaux", label: "Travaux" },
  { value: "autre", label: "Autre" },
];

export const TYPE_ACTION_OPTIONS: { value: TypeAction; label: string; description: string }[] = [
  { value: "information", label: "Information", description: "Affichage d'une note ou d'un avertissement, sans réponse requise" },
  { value: "question_oui_non", label: "Question Oui / Non", description: "L'agent répond Oui ou Non" },
  { value: "question_choix", label: "Choix multiple", description: "L'agent choisit parmi une liste de réponses" },
  { value: "saisie_texte", label: "Saisie texte libre", description: "L'agent saisit un texte libre (non évalué en V1)" },
  { value: "confirmation", label: "Confirmation d'action", description: "L'agent confirme avoir effectué une action" },
];

export const NIVEAU_OPTIONS: { value: NiveauAction; label: string; color: string }[] = [
  { value: "informatif", label: "Informatif", color: "text-blue-600" },
  { value: "alerte", label: "Alerte", color: "text-amber-600" },
  { value: "bloquant", label: "Bloquant", color: "text-red-600" },
];

export const ICONE_OPTIONS = [
  { value: "Eye", label: "Observation" },
  { value: "Train", label: "Train" },
  { value: "Users", label: "Agents" },
  { value: "AlertTriangle", label: "Vigilance" },
  { value: "BookOpen", label: "Consigne" },
  { value: "Phone", label: "Appel" },
  { value: "Wrench", label: "Technique" },
  { value: "CheckCircle2", label: "Validation" },
  { value: "MapPin", label: "Localisation" },
  { value: "Clock", label: "Horaire" },
  { value: "Shield", label: "Sécurité" },
  { value: "FileText", label: "Document" },
];

// ─── Utils ────────────────────────────────────────────────────────────────────

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Génère un ID d'action depuis le label (uniquement à la création) */
export function actionIdFromLabel(label: string, existingIds: string[]): string {
  const base = slugify(label).slice(0, 40) || "action";
  let id = base;
  let n = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

/** Prochain ID d'étape séquentiel (e1, e2…) */
export function nextEtapeId(existingIds: string[]): string {
  let n = 1;
  while (existingIds.includes(`e${n}`)) n++;
  return `e${n}`;
}

/** Toutes les IDs d'actions de la procédure (scope global) */
export function allActionIds(etapes: EtapeForm[]): string[] {
  return etapes.flatMap((e) => e.actions.map((a) => a.id));
}

export function emptyAction(_existingActionIds: string[]): ActionForm {
  return {
    _key: makeKey(),
    id: "",
    type: "question_oui_non",
    label: "",
    description: "",
    note: "",
    niveau: "informatif",
    obligatoire: true,
    verifiable: false,
    reponseAttendue: null,
    reponsesDisponibles: [],
    contactId: "",
    referenceDoc: "",
  };
}

export function emptyEtape(existingEtapeIds: string[]): EtapeForm {
  return {
    _key: makeKey(),
    id: nextEtapeId(existingEtapeIds),
    titre: "",
    description: "",
    icone: "Eye",
    actions: [],
  };
}

export function emptyProcedureForm(): ProcedureForm {
  return {
    slug: "",
    titre: "",
    typeProcedure: "cessation",
    description: "",
    version: "1.0",
    etapes: [],
    posteIds: [],
  };
}

// ─── Conversion vers ProcedureMetier (pour aperçu) ────────────────────────────

import type { ProcedureMetier } from "./types";

export function formToMetier(form: ProcedureForm): ProcedureMetier {
  return {
    id: form.id ?? "preview",
    slug: form.slug,
    titre: form.titre || "Sans titre",
    typeProcedure: form.typeProcedure,
    description: form.description || undefined,
    version: form.version,
    etapes: form.etapes.map((etape, i) => ({
      id: etape.id || `e${i + 1}`,
      titre: etape.titre || `Étape ${i + 1}`,
      description: etape.description || undefined,
      icone: etape.icone || undefined,
      ordre: i,
      actions: etape.actions.map((action) => ({
        id: action.id || `action-${i}`,
        type: action.type,
        label: action.label || "(sans label)",
        description: action.description || undefined,
        note: action.note || undefined,
        reponsesDisponibles: action.reponsesDisponibles.length > 0 ? action.reponsesDisponibles : undefined,
        reponseAttendue: action.reponseAttendue !== null ? action.reponseAttendue : undefined,
        obligatoire: action.type === "information" ? false : action.obligatoire,
        verifiable: action.verifiable,
        niveau: action.type === "information" ? "informatif" : action.niveau,
        contactId: action.contactId || undefined,
        referenceDoc: action.referenceDoc || undefined,
      })),
    })),
  };
}

// ─── Conversion depuis API (pour édition) ─────────────────────────────────────

export function metierToForm(
  p: { id: string; slug: string; titre: string; typeProcedure: string; description: string | null; version: string; etapes: string; postes: { posteId: string }[] }
): ProcedureForm {
  let etapesRaw: ReturnType<typeof formToMetier>["etapes"] = [];
  try { etapesRaw = JSON.parse(p.etapes); } catch { etapesRaw = []; }
  return {
    id: p.id,
    slug: p.slug,
    titre: p.titre,
    typeProcedure: p.typeProcedure as TypeProcedure,
    description: p.description ?? "",
    version: p.version,
    posteIds: p.postes.map((pp) => pp.posteId),
    etapes: etapesRaw.map((etape) => ({
      _key: makeKey(),
      id: etape.id,
      titre: etape.titre,
      description: (etape as { description?: string }).description ?? "",
      icone: etape.icone ?? "Eye",
      actions: (etape.actions ?? []).map((action) => ({
        _key: makeKey(),
        id: action.id,
        type: action.type,
        label: action.label,
        description: action.description ?? "",
        note: action.note ?? "",
        niveau: action.niveau,
        obligatoire: action.obligatoire,
        verifiable: action.verifiable,
        reponseAttendue: action.reponseAttendue !== undefined ? action.reponseAttendue : null,
        reponsesDisponibles: action.reponsesDisponibles ?? [],
        contactId: action.contactId ?? "",
        referenceDoc: action.referenceDoc ?? "",
      })),
    })),
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateProcedureForm(form: ProcedureForm): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!form.titre.trim()) errors.push({ field: "titre", message: "Le titre est requis" });
  if (!form.slug.trim()) errors.push({ field: "slug", message: "Le slug est requis" });
  else if (!/^[a-z0-9-]+$/.test(form.slug))
    errors.push({ field: "slug", message: "Slug invalide — uniquement a-z, 0-9, tirets" });
  if (!form.typeProcedure) errors.push({ field: "typeProcedure", message: "Le type est requis" });
  if (form.etapes.length === 0)
    errors.push({ field: "etapes", message: "La procédure doit avoir au moins une étape" });

  // Unicité IDs étapes
  const etapeIds = form.etapes.map((e) => e.id).filter(Boolean);
  const dupEtapes = etapeIds.filter((id, i) => etapeIds.indexOf(id) !== i);
  if (dupEtapes.length > 0)
    errors.push({ field: "etapes", message: `IDs d'étapes dupliqués : ${[...new Set(dupEtapes)].join(", ")}` });

  // Unicité IDs actions (scope procédure entière)
  const actionIdList = form.etapes.flatMap((e) => e.actions.map((a) => a.id)).filter(Boolean);
  const dupActions = actionIdList.filter((id, i) => actionIdList.indexOf(id) !== i);
  if (dupActions.length > 0)
    errors.push({ field: "actions", message: `IDs d'actions dupliqués : ${[...new Set(dupActions)].join(", ")}` });

  form.etapes.forEach((etape, ei) => {
    const ep = `Étape ${ei + 1}`;
    if (!etape.titre.trim()) errors.push({ field: `etapes[${ei}].titre`, message: `${ep} : titre requis` });
    if (!etape.id.trim()) errors.push({ field: `etapes[${ei}].id`, message: `${ep} : ID requis` });
    if (etape.actions.length === 0)
      errors.push({ field: `etapes[${ei}].actions`, message: `${ep} : au moins une action requise` });

    etape.actions.forEach((action, ai) => {
      const loc = `${ep}, action ${ai + 1}`;
      const pf = `etapes[${ei}].actions[${ai}]`;

      if (!action.label.trim()) errors.push({ field: `${pf}.label`, message: `${loc} : label requis` });
      if (!action.id.trim()) errors.push({ field: `${pf}.id`, message: `${loc} : ID requis` });

      // information : obligatoire interdit
      if (action.type === "information" && action.obligatoire)
        errors.push({ field: `${pf}.obligatoire`, message: `${loc} : une action "information" ne peut pas être obligatoire` });

      // information : niveau doit être informatif
      if (action.type === "information" && action.niveau !== "informatif")
        errors.push({ field: `${pf}.niveau`, message: `${loc} : une action "information" doit être de niveau informatif` });

      // saisie_texte : bloquant interdit (pas de réponse attendue exploitable en V1)
      if (action.type === "saisie_texte" && action.niveau === "bloquant")
        errors.push({ field: `${pf}.niveau`, message: `${loc} : une saisie texte ne peut pas être bloquante (aucune réponse attendue vérifiable en V1)` });

      // bloquant + question_oui_non : reponseAttendue obligatoire
      if (action.niveau === "bloquant" && action.type === "question_oui_non" && action.reponseAttendue === null)
        errors.push({ field: `${pf}.reponseAttendue`, message: `${loc} : la réponse attendue est obligatoire pour une action bloquante` });

      // bloquant + question_choix : reponseAttendue doit être dans la liste
      if (action.niveau === "bloquant" && action.type === "question_choix") {
        const ra = String(action.reponseAttendue ?? "");
        if (!ra || !action.reponsesDisponibles.includes(ra))
          errors.push({ field: `${pf}.reponseAttendue`, message: `${loc} : la réponse attendue doit être dans la liste des choix` });
      }

      // question_choix : au moins 2 choix
      if (action.type === "question_choix" && action.reponsesDisponibles.length < 2)
        errors.push({ field: `${pf}.reponsesDisponibles`, message: `${loc} : au moins 2 choix requis pour une question à choix multiples` });
    });
  });

  return errors;
}
