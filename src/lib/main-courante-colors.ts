// Mapping nature → couleur du chip, pour faciliter le repérage visuel dans
// les listes de main courante. Codes EF connus (S1…S9, RH) ont une couleur
// dédiée ; toute autre valeur (texte libre saisi par l'admin) retombe sur
// une couleur neutre.

export interface NatureColors {
  /** Classes Tailwind pour un chip sur fond clair (listes, détails). */
  chip: string;
  /** Classes Tailwind pour un chip sur fond foncé (header bleu de détail). */
  chipOnDark: string;
}

const MAP: Record<string, NatureColors> = {
  S1: { chip: "bg-red-100 text-red-800", chipOnDark: "bg-red-500/30 text-white" },
  S2: { chip: "bg-sky-100 text-sky-800", chipOnDark: "bg-sky-400/40 text-white" },
  S3: { chip: "bg-cyan-100 text-cyan-800", chipOnDark: "bg-cyan-400/40 text-white" },
  S4: { chip: "bg-teal-100 text-teal-800", chipOnDark: "bg-teal-400/40 text-white" },
  S5: { chip: "bg-emerald-100 text-emerald-800", chipOnDark: "bg-emerald-400/40 text-white" },
  S6: { chip: "bg-amber-100 text-amber-800", chipOnDark: "bg-amber-400/40 text-white" },
  S7: { chip: "bg-violet-100 text-violet-800", chipOnDark: "bg-violet-400/40 text-white" },
  S8: { chip: "bg-fuchsia-100 text-fuchsia-800", chipOnDark: "bg-fuchsia-400/40 text-white" },
  S9: { chip: "bg-orange-100 text-orange-800", chipOnDark: "bg-orange-400/40 text-white" },
  RH: { chip: "bg-rose-100 text-rose-800", chipOnDark: "bg-rose-400/40 text-white" },
};

const DEFAULT_COLORS: NatureColors = {
  chip: "bg-slate-100 text-slate-700",
  chipOnDark: "bg-white/20 text-white",
};

export function getNatureColors(nature?: string | null): NatureColors {
  if (!nature) return DEFAULT_COLORS;
  const key = nature.trim().toUpperCase();
  return MAP[key] ?? DEFAULT_COLORS;
}
