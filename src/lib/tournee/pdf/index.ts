/**
 * Préparation des données du PDF (serveur) : lecture des photos sur disque,
 * plan théorique, bilans. Le rendu est délégué à TourneeDocument.
 */
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getDocumentPath } from "@/lib/documents";
import { calculerBilan, calculerProgression, construirePlanTheorique } from "../planning";
import type { TourneeEvent, TourneePlan } from "../types";
import { renderTourneePdf, type PdfBilanParticipant, type PdfPhoto } from "./TourneeDocument";

async function chargerPhotos(plan: TourneePlan): Promise<Map<string, PdfPhoto>> {
  const ids = plan.etapes.flatMap((e) => e.photos.map((p) => p.id));
  const out = new Map<string, PdfPhoto>();
  if (!ids.length) return out;
  const docs = await prisma.document.findMany({ where: { id: { in: ids } }, select: { id: true, mimeType: true } });
  await Promise.all(
    docs.map(async (d) => {
      if (d.mimeType !== "image/jpeg" && d.mimeType !== "image/png") return;
      try {
        out.set(d.id, { data: await fs.readFile(getDocumentPath(d.id, d.mimeType)), format: d.mimeType === "image/png" ? "png" : "jpg" });
      } catch {
        /* photo supprimée depuis la copie : ignorée */
      }
    }),
  );
  return out;
}

export async function genererPdf(args: {
  plan: TourneePlan;
  date: string | null;
  heureDepart: string;
  participants?: { nom: string; events: TourneeEvent[] }[];
  /** Date de calcul des horaires quand `date` est null (modèle). */
  dateRef: string;
}): Promise<Buffer> {
  const theorique = construirePlanTheorique(args.plan.etapes, args.date ?? args.dateRef, args.heureDepart);
  const bilans: PdfBilanParticipant[] = (args.participants ?? [])
    .map((p) => ({ nom: p.nom, prog: calculerProgression(args.plan.etapes, p.events) }))
    .filter((p) => p.prog.demarre)
    .map((p) => ({ nom: p.nom, bilan: calculerBilan(args.plan.etapes, theorique, p.prog) }));
  return renderTourneePdf({
    plan: { ...args.plan, heureDepart: args.heureDepart },
    theorique,
    date: args.date,
    photos: await chargerPhotos(args.plan),
    bilans,
  });
}

export function nomFichier(titre: string, date: string | null): string {
  const base = titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "tournee"}${date ? `-${date}` : ""}.pdf`;
}
