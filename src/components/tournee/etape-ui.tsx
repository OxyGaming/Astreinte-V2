import { Flag, MapPin, Coffee, Target, MessagesSquare, type LucideIcon } from "lucide-react";
import type { TourneeEtapeType } from "@/lib/tournee/types";
import type { NiveauEcart, NiveauFaisabilite } from "@/lib/tournee/planning";
import { formatEcart } from "@/lib/tournee/time";

export const ETAPE_ICON: Record<TourneeEtapeType, LucideIcon> = {
  DEPART: Flag,
  POINT: MapPin,
  PAUSE: Coffee,
  EXERCICE: Target,
  RESTITUTION: MessagesSquare,
};

export const NIVEAU_STYLE: Record<NiveauEcart, { badge: string; dot: string; emoji: string }> = {
  a_venir: { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-300", emoji: "⚪" },
  avance: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", emoji: "🟢" },
  dans_les_temps: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", emoji: "🟢" },
  retard: { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500", emoji: "🟠" },
  retard_fort: { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", emoji: "🔴" },
};

export function libelleEcart(niveau: NiveauEcart, ecartMin: number): string {
  const m = Math.round(Math.abs(ecartMin));
  switch (niveau) {
    case "a_venir":
      return "Pas encore commencé";
    case "dans_les_temps":
      return "Dans les temps";
    case "avance":
      return `En avance de ${m} min`;
    default:
      return `Retard de ${m} min`;
  }
}

export const libelleEcartCourt = (niveau: NiveauEcart, ecartMin: number) =>
  niveau === "a_venir" ? "—" : formatEcart(ecartMin);

export const FAISABILITE_STYLE: Record<NiveauFaisabilite, { badge: string; emoji: string; titre: string; conseil: string }> = {
  faisable: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    emoji: "🟢",
    titre: "Encore réalisable",
    conseil: "L'étape optionnelle reste réalisable.",
  },
  juste: {
    badge: "bg-orange-50 text-orange-800 border-orange-200",
    emoji: "🟠",
    titre: "Faisabilité compromise",
    conseil: "L'étape optionnelle reste réalisable mais avec peu de marge.",
  },
  non_faisable: {
    badge: "bg-red-50 text-red-800 border-red-200",
    emoji: "🔴",
    titre: "Non réalisable selon le planning",
    conseil: "L'étape optionnelle n'est plus compatible avec le planning.",
  },
};
