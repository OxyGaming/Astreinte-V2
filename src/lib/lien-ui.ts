/**
 * Registre UI des thématiques de liens : icônes Lucide curées + couleurs
 * d'accent. Pur (importable côté client et serveur).
 */
import type { LucideIcon } from "lucide-react";
import {
  Link2, Wrench, CloudSun, Users, ClipboardList, DoorOpen, Phone, Map,
  BookOpen, Shield, FileText, AlertTriangle, Calendar, Folder, Train, Building2,
} from "lucide-react";

// ─── Icônes ───────────────────────────────────────────────────────────────────

export const LIEN_ICONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "Link2", label: "Lien", Icon: Link2 },
  { value: "Wrench", label: "Outils", Icon: Wrench },
  { value: "CloudSun", label: "Météo", Icon: CloudSun },
  { value: "Users", label: "Équipe / RH", Icon: Users },
  { value: "ClipboardList", label: "Formulaires", Icon: ClipboardList },
  { value: "DoorOpen", label: "Ouverture", Icon: DoorOpen },
  { value: "Phone", label: "Contacts", Icon: Phone },
  { value: "Map", label: "Cartes", Icon: Map },
  { value: "BookOpen", label: "Documentation", Icon: BookOpen },
  { value: "Shield", label: "Sécurité", Icon: Shield },
  { value: "FileText", label: "Documents", Icon: FileText },
  { value: "AlertTriangle", label: "Vigilance", Icon: AlertTriangle },
  { value: "Calendar", label: "Planning", Icon: Calendar },
  { value: "Folder", label: "Dossier", Icon: Folder },
  { value: "Train", label: "Circulation", Icon: Train },
  { value: "Building2", label: "Poste", Icon: Building2 },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  LIEN_ICONS.map((i) => [i.value, i.Icon])
);

/** Composant icône pour une clé donnée (Link2 par défaut). */
export function getLienIcon(name: string | null | undefined): LucideIcon {
  return (name ? ICON_MAP[name] : undefined) ?? Link2;
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

export interface LienColor {
  value: string;
  label: string;
  /** Pastille d'en-tête de thématique. */
  head: string;
  /** Pastille d'icône sur les tuiles. */
  tile: string;
  /** Bordure d'une tuile au survol. */
  border: string;
  /** Flèche d'une tuile au survol. */
  arrow: string;
  /** Échantillon plein (sélecteur de couleur). */
  swatch: string;
}

export const LIEN_COLORS: LienColor[] = [
  { value: "blue",    label: "Bleu",   head: "bg-blue-100 text-blue-700",       tile: "bg-blue-50 text-blue-700",       border: "hover:border-blue-300",    arrow: "group-hover:text-blue-500",    swatch: "bg-blue-500" },
  { value: "orange",  label: "Orange", head: "bg-orange-100 text-orange-700",   tile: "bg-orange-50 text-orange-700",   border: "hover:border-orange-300",  arrow: "group-hover:text-orange-500",  swatch: "bg-orange-500" },
  { value: "violet",  label: "Violet", head: "bg-violet-100 text-violet-700",   tile: "bg-violet-50 text-violet-700",   border: "hover:border-violet-300",  arrow: "group-hover:text-violet-500",  swatch: "bg-violet-500" },
  { value: "emerald", label: "Vert",   head: "bg-emerald-100 text-emerald-700", tile: "bg-emerald-50 text-emerald-700", border: "hover:border-emerald-300", arrow: "group-hover:text-emerald-500", swatch: "bg-emerald-500" },
  { value: "amber",   label: "Jaune",  head: "bg-amber-100 text-amber-700",     tile: "bg-amber-50 text-amber-700",     border: "hover:border-amber-300",   arrow: "group-hover:text-amber-500",   swatch: "bg-amber-500" },
  { value: "rose",    label: "Rose",   head: "bg-rose-100 text-rose-700",       tile: "bg-rose-50 text-rose-700",       border: "hover:border-rose-300",    arrow: "group-hover:text-rose-500",    swatch: "bg-rose-500" },
  { value: "slate",   label: "Gris",   head: "bg-slate-200 text-slate-700",     tile: "bg-slate-100 text-slate-600",    border: "hover:border-slate-300",   arrow: "group-hover:text-slate-500",   swatch: "bg-slate-500" },
];

const COLOR_MAP: Record<string, LienColor> = Object.fromEntries(
  LIEN_COLORS.map((c) => [c.value, c])
);

/** Jeu de classes pour une couleur (bleu par défaut). */
export function getLienColor(value: string | null | undefined): LienColor {
  return (value ? COLOR_MAP[value] : undefined) ?? LIEN_COLORS[0];
}
