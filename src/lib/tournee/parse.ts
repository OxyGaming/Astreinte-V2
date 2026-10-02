/**
 * Lecture / normalisation des colonnes JSON du module Tournée — pur.
 * Toute valeur lue en base passe par ces fonctions : une donnée corrompue
 * dégrade l'affichage (valeur par défaut), elle ne fait jamais planter la page.
 */
import { isValidHttpUrl, toLienRefs } from "@/lib/liens";
import type { LienRef } from "@/lib/types";
import { isValidHHmm } from "./time";
import {
  DEFAULT_SEUILS,
  TOURNEE_BLOC_TYPES,
  TOURNEE_ETAPE_TYPES,
  type TourneeAProposSection,
  type TourneeBloc,
  type TourneeContactRef,
  type TourneeEtapeInput,
  type TourneeEtapeType,
  type TourneeLieu,
  type TourneePlan,
  type TourneeSeuils,
} from "./types";

function safeJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const optStr = (v: unknown): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
};
const genId = () => Math.random().toString(36).slice(2, 10);

export function isValidLatitude(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
}
export function isValidLongitude(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toMinutes(v: unknown, fallback = 0): number {
  const n = toNumber(v);
  return n === null ? fallback : Math.max(0, Math.min(24 * 60, Math.round(n)));
}

export function toLieu(v: unknown): TourneeLieu | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const lat = toNumber(o.latitude);
  const lng = toNumber(o.longitude);
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;
  return { libelle: str(o.libelle).trim() || "Localisation", latitude: lat, longitude: lng };
}

export function toBlocs(v: unknown): TourneeBloc[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b) => {
      const type = (TOURNEE_BLOC_TYPES as readonly string[]).includes(str(b.type))
        ? (b.type as TourneeBloc["type"])
        : "SECTION";
      return {
        id: optStr(b.id) ?? genId(),
        type,
        titre: optStr(b.titre),
        texte: str(b.texte),
        lieu: toLieu(b.lieu),
      };
    })
    .filter((b) => b.texte.trim() || b.titre || b.lieu);
}

export function parseBlocs(raw: string | null | undefined): TourneeBloc[] {
  return toBlocs(safeJson(raw));
}

export function toAPropos(v: unknown): TourneeAProposSection[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b) => ({ id: optStr(b.id) ?? genId(), titre: str(b.titre).trim(), texte: str(b.texte) }))
    .filter((s) => s.titre || s.texte.trim());
}

export function parseAPropos(raw: string | null | undefined): TourneeAProposSection[] {
  return toAPropos(safeJson(raw));
}

export function toContacts(v: unknown): TourneeContactRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({
      id: optStr(c.id) ?? genId(),
      fonction: str(c.fonction).trim(),
      contactId: optStr(c.contactId),
      nom: optStr(c.nom),
      telephone: optStr(c.telephone),
    }))
    .filter((c) => c.fonction && (c.contactId || c.nom || c.telephone));
}

export function parseContacts(raw: string | null | undefined): TourneeContactRef[] {
  return toContacts(safeJson(raw));
}

export function toSeuils(v: unknown): TourneeSeuils {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const n = (x: unknown, d: number) => {
    const k = toNumber(x);
    return k === null ? d : Math.max(0, Math.min(240, Math.round(k)));
  };
  return {
    toleranceMin: n(o.toleranceMin, DEFAULT_SEUILS.toleranceMin),
    rougeMin: n(o.rougeMin, DEFAULT_SEUILS.rougeMin),
    margeConfortMin: n(o.margeConfortMin, DEFAULT_SEUILS.margeConfortMin),
  };
}

export function parseSeuils(raw: string | null | undefined): TourneeSeuils {
  return toSeuils(safeJson(raw));
}

export function parsePlan(raw: string): TourneePlan | null {
  const v = safeJson(raw);
  if (!v || typeof v !== "object" || !Array.isArray((v as TourneePlan).etapes)) return null;
  return v as TourneePlan;
}

// ─── Validation d'une étape (back-office et ajustement référent) ──────────────

export type EtapeValidation = { ok: true; value: TourneeEtapeInput } | { ok: false; error: string };

export function validerEtape(raw: unknown, label = "Étape"): EtapeValidation {
  if (!raw || typeof raw !== "object") return { ok: false, error: `${label} : format invalide` };
  const o = raw as Record<string, unknown>;
  const titre = str(o.titre).trim();
  if (!titre) return { ok: false, error: `${label} : titre obligatoire` };
  const type: TourneeEtapeType = (TOURNEE_ETAPE_TYPES as readonly string[]).includes(str(o.type))
    ? (o.type as TourneeEtapeType)
    : "POINT";
  const heureImposee = optStr(o.heureImposee) ?? null;
  if (heureImposee && !isValidHHmm(heureImposee)) {
    return { ok: false, error: `${label} : heure imposée invalide (HH:mm)` };
  }
  const lat = toNumber(o.latitude);
  const lng = toNumber(o.longitude);
  if ((lat === null) !== (lng === null)) {
    return { ok: false, error: `${label} : latitude et longitude vont ensemble` };
  }
  if (lat !== null && (!isValidLatitude(lat) || !isValidLongitude(lng))) {
    return { ok: false, error: `${label} : coordonnées GPS invalides` };
  }
  const liens: LienRef[] = toLienRefs(o.liens);
  for (const l of liens) {
    if (!l.lienId && (!l.libelle || !isValidHttpUrl(l.url))) {
      return { ok: false, error: `${label} : lien libre incomplet ou URL invalide` };
    }
  }
  const optionnelle = o.optionnelle === true;
  const surcout = toNumber(o.surcoutTrajetMin);
  return {
    ok: true,
    value: {
      id: optStr(o.id),
      type,
      titre,
      description: optStr(o.description) ?? null,
      optionnelle,
      heureImposee: optionnelle ? null : heureImposee,
      dureeMin: toMinutes(o.dureeMin),
      trajetSuivanteMin: optionnelle ? 0 : toMinutes(o.trajetSuivanteMin),
      surcoutTrajetMin: optionnelle ? (surcout === null ? 0 : toMinutes(surcout)) : null,
      adresse: optStr(o.adresse) ?? null,
      latitude: lat,
      longitude: lng,
      localisationMasquee: o.localisationMasquee === true,
      liens,
      contenu: toBlocs(o.contenu),
    },
  };
}
