/**
 * Ajustement d'une réalisation par son référent AVANT le départ :
 * date, heure de départ, ordre / retrait / ajout d'étapes, temps, caractère
 * optionnel. Ne touche QUE la copie figée — jamais le modèle.
 */
import { prisma } from "@/lib/prisma";
import { isValidHttpUrl } from "@/lib/liens";
import { validerEtape } from "./parse";
import { isValidHHmm, isValidYmd } from "./time";
import type { TourneePlan, TourneePlanEtape } from "./types";

export class AjustementError extends Error {}

const genKey = () => `local-${Math.random().toString(36).slice(2, 10)}`;

/** Pur : applique la liste ordonnée d'étapes reçue au plan existant. */
export function appliquerEtapes(plan: TourneePlan, raw: unknown): TourneePlanEtape[] {
  if (!Array.isArray(raw)) throw new AjustementError("Liste d'étapes invalide");
  const byKey = new Map(plan.etapes.map((e) => [e.key, e]));
  const vus = new Set<string>();
  const out: TourneePlanEtape[] = [];
  raw.forEach((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const existing = typeof o.key === "string" ? byKey.get(o.key) : undefined;
    const r = validerEtape(existing ? { ...existing, ...o, liens: [] } : { ...o, liens: [] }, `Étape ${i + 1}`);
    if (!r.ok) throw new AjustementError(r.error);
    const v = r.value;
    if (existing) {
      if (vus.has(existing.key)) throw new AjustementError(`Étape ${i + 1} : doublon`);
      vus.add(existing.key);
      out.push({
        ...existing,
        titre: v.titre,
        optionnelle: v.optionnelle,
        heureImposee: v.heureImposee ?? null,
        dureeMin: v.dureeMin,
        trajetSuivanteMin: v.trajetSuivanteMin,
        surcoutTrajetMin: v.surcoutTrajetMin ?? null,
      });
    } else {
      const liens = Array.isArray(o.liens)
        ? (o.liens as { libelle?: unknown; url?: unknown }[])
            .filter((l) => typeof l?.libelle === "string" && isValidHttpUrl(l.url))
            .map((l) => ({ libelle: String(l.libelle), url: String(l.url) }))
        : [];
      out.push({
        key: genKey(),
        type: v.type,
        titre: v.titre,
        description: v.description ?? null,
        optionnelle: v.optionnelle,
        heureImposee: v.heureImposee ?? null,
        dureeMin: v.dureeMin,
        trajetSuivanteMin: v.trajetSuivanteMin,
        surcoutTrajetMin: v.surcoutTrajetMin ?? null,
        adresse: v.adresse ?? null,
        latitude: v.latitude ?? null,
        longitude: v.longitude ?? null,
        localisationMasquee: v.localisationMasquee,
        liens,
        contenu: v.contenu,
        photos: [],
      });
    }
  });
  if (!out.some((e) => !e.optionnelle)) throw new AjustementError("Le parcours doit garder au moins une étape obligatoire");
  return out;
}

export async function ajusterPlan(
  r: { id: string; planSnapshot: string; date: string; heureDepart: string },
  body: { date?: unknown; heureDepart?: unknown; etapes?: unknown },
): Promise<void> {
  const { TourneeError } = await import("./realisation");
  const plan = JSON.parse(r.planSnapshot) as TourneePlan;
  const data: { date?: string; heureDepart?: string; planSnapshot?: string } = {};
  if (body.date !== undefined) {
    if (!isValidYmd(body.date)) throw new TourneeError(400, "Date invalide");
    data.date = body.date;
  }
  if (body.heureDepart !== undefined) {
    if (!isValidHHmm(body.heureDepart)) throw new TourneeError(400, "Heure de départ invalide");
    data.heureDepart = body.heureDepart;
  }
  if (body.etapes !== undefined) {
    try {
      data.planSnapshot = JSON.stringify({ ...plan, etapes: appliquerEtapes(plan, body.etapes) });
    } catch (e) {
      if (e instanceof AjustementError) throw new TourneeError(400, e.message);
      throw e;
    }
  }
  await prisma.tourneeRealisation.update({ where: { id: r.id }, data });
}
