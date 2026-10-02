import type { TourneeEtapeInput } from "@/lib/tournee/types";

export interface EditorPhoto {
  id: string;
  caption: string | null;
}

/** Étape telle que manipulée par l'éditeur (photos gérées à part, en direct). */
export type EditorEtape = TourneeEtapeInput & { photos: EditorPhoto[] };

export const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
export const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

// Conversion ligne Prisma → état éditeur (page serveur + éditeur).
export function toEditor(e: {
  id: string; type: string; titre: string; description: string | null; optionnelle: boolean;
  heureImposee: string | null; dureeMin: number; trajetSuivanteMin: number; surcoutTrajetMin: number | null;
  adresse: string | null; latitude: number | null; longitude: number | null; localisationMasquee: boolean;
  liens: string | null; contenu: string; photos: { id: string; caption: string | null }[];
}): EditorEtape {
  const safe = (raw: string | null) => {
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  return {
    id: e.id,
    type: e.type as EditorEtape["type"],
    titre: e.titre,
    description: e.description,
    optionnelle: e.optionnelle,
    heureImposee: e.heureImposee,
    dureeMin: e.dureeMin,
    trajetSuivanteMin: e.trajetSuivanteMin,
    surcoutTrajetMin: e.surcoutTrajetMin,
    adresse: e.adresse,
    latitude: e.latitude,
    longitude: e.longitude,
    localisationMasquee: e.localisationMasquee,
    liens: safe(e.liens),
    contenu: safe(e.contenu),
    photos: e.photos.map((p) => ({ id: p.id, caption: p.caption })),
  };
}
