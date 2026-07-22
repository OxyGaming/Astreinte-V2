import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, assertTeamAccess } from "@/lib/auth";
import {
  depuisCil,
  depuisSession,
  type PropositionChamp,
} from "@/lib/rci/reprise";
import { RCI_EVENT_TYPES } from "@/lib/rci/guidance";

/**
 * Propose un pré-remplissage du RCI à partir de la source terrain rattachée.
 *
 * Ne modifie rien : renvoie une proposition (`valeurs` + `rubriques`) que le
 * wizard fusionne côté client via `appliquer()`, qui ne remplace jamais une
 * saisie existante. Le serveur n'écrit pas le payload lui-même — l'autosave du
 * wizard s'en charge, ce qui garde une seule voie d'écriture.
 */
const schema = z.object({
  /// Typologie tranchée par l'utilisateur quand une source est ambiguë.
  typologie: z.enum(RCI_EVENT_TYPES).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;

  const rci = await prisma.rci.findUnique({ where: { id } });
  if (!rci) return NextResponse.json({ error: "RCI inconnu" }, { status: 404 });
  if (!assertTeamAccess(u, rci)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (rci.status === "FINAL") {
    return NextResponse.json(
      { error: "RCI finalisé, lecture seule." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { typologie } = parsed.data;

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  // Les deux sources sont cumulables : on interroge celles qui sont rattachées
  // et on rend l'union des propositions. Deux sources peuvent viser le même
  // champ — c'est l'écran de reprise qui présentera le choix.
  const propositions: PropositionChamp[] = [];

  if (rci.cilIncidentId) {
    const inc = await prisma.cilIncident.findUnique({
      where: { id: rci.cilIncidentId },
      include: {
        events: { orderBy: [{ occurredAt: "asc" }, { seq: "asc" }] },
        intervenants: true,
      },
    });
    if (inc && assertTeamAccess(u, inc)) {
      const res = depuisCil(
        {
          id: inc.id,
          reference: inc.reference,
          type: inc.type,
          typeLibre: inc.typeLibre,
          occurredAt: inc.occurredAt.toISOString(),
          lieu: inc.lieu,
          poste: inc.poste,
          voie: inc.voie,
          voies: inc.voies,
          km: inc.km,
          observations: inc.observations,
          gareMode: inc.gareMode,
          gareUnique: inc.gareUnique,
          gareA: inc.gareA,
          gareB: inc.gareB,
          cilNom: inc.cilNom,
          cilPrenom: inc.cilPrenom,
          cilEtablissement: inc.cilEtablissement,
          arrivedOnSiteAt: iso(inc.arrivedOnSiteAt),
        },
        inc.events.map((e) => ({
          type: e.type,
          occurredAt: e.occurredAt.toISOString(),
          seq: e.seq,
          label: e.label,
          note: e.note,
          actorName: e.actorName,
        })),
        inc.intervenants.map((i) => ({
          type: i.type,
          typeLibre: i.typeLibre,
          nom: i.nom,
          tel: i.tel,
          arrivedAt: iso(i.arrivedAt),
        })),
        typologie,
      );
      propositions.push(...res.propositions);
    }
  }

  if (rci.sessionId) {
    const session = await prisma.ficheSession.findUnique({
      where: { id: rci.sessionId },
      include: {
        createdBy: { select: { nom: true, prenom: true } },
        actionLogs: { orderBy: { timestamp: "asc" } },
        commentLogs: { orderBy: { timestamp: "asc" } },
      },
    });
    if (session && assertTeamAccess(u, { authorId: session.createdByUserId })) {
      const nomAuteur = [session.createdBy?.prenom, session.createdBy?.nom]
        .filter(Boolean)
        .join(" ")
        .trim();

      const res = depuisSession(
        {
          id: session.id,
          ficheSlug: session.ficheSlug,
          ficheTitre: session.ficheTitre,
          startedAt: session.startedAt.toISOString(),
          endedAt: iso(session.endedAt),
          createdByName: nomAuteur || null,
        },
        [
          // Une action décochée retire une information : elle n'a pas sa place
          // dans un récit de constatations.
          ...session.actionLogs
            .filter((a) => a.type === "checked")
            .map((a) => ({
              timestamp: a.timestamp.toISOString(),
              texte: a.actionLabel,
              auteur: null,
              genre: "action" as const,
            })),
          ...session.commentLogs.map((c) => ({
            timestamp: c.timestamp.toISOString(),
            texte: c.message,
            auteur: null,
            genre: "commentaire" as const,
          })),
        ],
        typologie,
      );
      propositions.push(...res.propositions);
    }
  }

  return NextResponse.json({ propositions });
}
