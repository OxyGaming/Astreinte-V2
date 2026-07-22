"use client";

import type { ReactNode } from "react";
import type { Ternary } from "@/lib/rci/fields";
import {
  REQUIREMENT_LABELS,
  type Requirement,
} from "@/lib/rci/guidance";

// ─── Helpers de conversion entre formats UI et formats payload Word ──────────

/** "DD/MM/YYYY" → "YYYY-MM-DD" pour `<input type="date">`. */
export function dateFrToIso(fr: string): string {
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
/** "YYYY-MM-DD" → "DD/MM/YYYY" (format Word). */
export function dateIsoToFr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
/**
 * Format heure stocké dans le payload (= format Word) : `HhMM` sans zéro
 * de tête sur les heures, ex. "7h30". Compatible avec les anciennes saisies
 * "07h30" (le DossierNumber les pad-startait déjà à 2 chiffres).
 */
export function timeFrToIso(fr: string): string {
  const m = fr.match(/^(\d{1,2})h(\d{2})$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}
/** "HH:MM" (input time HTML) → "HhMM" sans zéro de tête (format Word). */
export function timeIsoToFr(iso: string): string {
  const m = iso.match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${parseInt(m[1], 10)}h${m[2]}` : "";
}

/** Date du jour au format payload `JJ/MM/AAAA`. */
export function todayFr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/** Heure courante au format payload `HhMM`. */
export function nowFr(): string {
  const d = new Date();
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── Guidage : pastilles « obligatoire / selon le cas / sans objet » ─────────

const REQUIREMENT_STYLES: Record<Requirement, string> = {
  required: "bg-rose-50 text-rose-700 border-rose-200",
  conditional: "bg-amber-50 text-amber-700 border-amber-200",
  na: "bg-slate-100 text-slate-400 border-slate-200",
};

/**
 * Pastille indiquant ce que la situation attend de la rubrique. Muette pour
 * les rubriques universellement obligatoires (`hideRequired`) : afficher
 * « Obligatoire » sur les trois quarts du formulaire n'apprend rien.
 */
export function RequirementBadge({
  requirement,
  filled,
}: {
  requirement: Requirement;
  /** Rubrique obligatoire déjà renseignée : on bascule sur un ✓ discret. */
  filled?: boolean;
}) {
  if (requirement === "required" && filled) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
        ✓ Renseigné
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${REQUIREMENT_STYLES[requirement]}`}
    >
      {requirement === "required" && "● "}
      {REQUIREMENT_LABELS[requirement]}
    </span>
  );
}

// ─── Champs ─────────────────────────────────────────────────────────────────

/** Libellé commun à tous les champs — repris du Livret CIL. */
const LABEL_CLS = "block text-xs font-semibold text-slate-700 mb-1";

/** Champ texte avec label. */
export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  multiline,
  rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className={LABEL_CLS}>
        {label}
        {hint && (
          <span className="ml-1 text-[10px] font-normal font-mono text-slate-400">
            {hint}
          </span>
        )}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows ?? 4}
          className="input w-full min-h-[100px]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="input w-full"
        />
      )}
    </label>
  );
}

/** Case à cocher booléenne (true/false). */
export function CheckField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-sm select-none ${
        disabled ? "cursor-default opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 shrink-0 accent-blue-800"
      />
      <span>{label}</span>
    </label>
  );
}

/** Toggle ternaire (oui / non / non renseigné). */
export function TernaryField({
  label,
  value,
  onChange,
  disabled,
  /** Aligne les boutons sur la même ligne que le libellé (grilles compactes). */
  inline,
}: {
  label: string;
  value: Ternary;
  onChange: (v: Ternary) => void;
  disabled?: boolean;
  inline?: boolean;
}) {
  function Btn({ state, children }: { state: Ternary; children: ReactNode }) {
    const active = value === state;
    const cls = active
      ? state === true
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : state === false
          ? "bg-rose-100 text-rose-800 border-rose-300"
          : "bg-slate-100 text-slate-700 border-slate-300"
      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300";
    return (
      <button
        type="button"
        onClick={() => onChange(state)}
        disabled={disabled}
        aria-pressed={active}
        className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-60 ${cls}`}
      >
        {children}
      </button>
    );
  }
  const buttons = (
    <div className="inline-flex gap-1 shrink-0">
      <Btn state={true}>OUI</Btn>
      <Btn state={false}>NON</Btn>
      <Btn state={null}>—</Btn>
    </div>
  );
  if (inline) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {label && (
          <span className="text-xs font-semibold text-slate-700 min-w-0 truncate">
            {label}
          </span>
        )}
        {buttons}
      </div>
    );
  }
  return (
    <div className="min-w-0">
      {label && <span className={LABEL_CLS}>{label}</span>}
      {buttons}
    </div>
  );
}

/**
 * Champ date — UI = `<input type="date">` (YYYY-MM-DD), stockage payload
 * `JJ/MM/AAAA` (= format imprimé dans le Word, inchangé). Le raccourci
 * « Aujourd'hui » reprend le geste du Livret CIL : sur le terrain, la date
 * courante est le cas courant.
 */
export function DateField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isoValue = dateFrToIso(value);
  return (
    <div className="min-w-0">
      <span className={LABEL_CLS}>
        {label}
        {hint && (
          <span className="ml-1 text-[10px] font-normal font-mono text-slate-400">
            {hint}
          </span>
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={isoValue}
          onChange={(e) => onChange(dateIsoToFr(e.target.value))}
          disabled={disabled}
          aria-label={label}
          className="input flex-1 min-w-[8.5rem]"
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(todayFr())}
            className="text-xs font-semibold px-2.5 rounded-lg border border-blue-200 text-blue-800 hover:bg-blue-50 shrink-0"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Champ heure — UI = `<input type="time">` (HH:MM), stockage payload
 * `HhMM` sans zéro de tête sur l'heure (ex. "7h30"). Le rendu Word
 * affiche tel quel.
 *
 * « Maintenant » est le même geste que dans le Livret CIL : la plupart des
 * heures d'un RCI sont notées au moment où l'action a lieu.
 */
export function TimeField({
  label,
  hint,
  value,
  onChange,
  disabled,
  /** Masque le libellé (colonnes de tableau qui portent déjà l'en-tête). */
  hideLabel,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const isoValue = timeFrToIso(value);
  return (
    <div className="min-w-0">
      {!hideLabel && (
        <span className={LABEL_CLS}>
          {label}
          {hint && (
            <span className="ml-1 text-[10px] font-normal font-mono text-slate-400">
              {hint}
            </span>
          )}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        <input
          type="time"
          value={isoValue}
          onChange={(e) => onChange(timeIsoToFr(e.target.value))}
          disabled={disabled}
          aria-label={label}
          className="input flex-1 min-w-[6.5rem] px-2"
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(nowFr())}
            title="Heure courante"
            className="text-xs font-semibold px-2 rounded-lg border border-blue-200 text-blue-800 hover:bg-blue-50 shrink-0"
          >
            Maint.
          </button>
        )}
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Effacer ${label}`}
            className="text-xs px-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Bloc visuel pour grouper des champs.
 *
 * Quand la rubrique est « sans objet » pour la situation déclarée, on ne la
 * masque pas : un RCI atypique peut la réclamer. On la replie derrière un
 * bouton, ce qui allège l'écran tout en gardant la saisie possible.
 */
export function FieldSet({
  title,
  hint,
  requirement,
  filled,
  note,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  hint?: string;
  requirement?: Requirement;
  filled?: boolean;
  note?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const isRequiredEmpty = requirement === "required" && !filled;
  return (
    <fieldset
      className={`border rounded-xl p-4 transition-colors ${
        collapsed ? "space-y-0" : "space-y-3"
      } ${
        isRequiredEmpty
          ? "border-rose-200 bg-rose-50/30"
          : requirement === "na"
            ? "border-slate-200 bg-slate-50/60"
            : "border-slate-200"
      }`}
    >
      <legend className="px-2">
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-700">{title}</span>
          {hint && (
            <span className="text-[10px] font-normal font-mono text-slate-400">
              {hint}
            </span>
          )}
          {requirement && (
            <RequirementBadge requirement={requirement} filled={filled} />
          )}
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              {collapsed ? "Afficher quand même" : "Replier"}
            </button>
          )}
        </span>
      </legend>
      {note && !collapsed && (
        <p className="text-[11px] text-slate-500 italic -mt-1">{note}</p>
      )}
      {!collapsed && children}
    </fieldset>
  );
}
