import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, teamScope, assertTeamAccess } from "@/lib/auth";
import { createEvent } from "@/lib/cil/repo";
import { INCIDENT_TYPES, ETABLISSEMENTS, GARE_MODES } from "@/lib/cil/types";

/** Liste des incidents CIL visibles (scope équipe). Ouverts d'abord. */
export async function GET() {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const incidents = await prisma.cilIncident.findMany({
    where: { ...teamScope(u) },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    // Portage : pas de modèle `Team`; l'auteur porte `nom` / `prenom`.
    include: {
      author: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { events: true, depeches: true, intervenants: true } },
    },
  });
  return NextResponse.json(incidents);
}

const createSchema = z.object({
  teamId: z.string().optional(),
  type: z.enum(INCIDENT_TYPES),
  typeLibre: z.string().trim().max(120).nullable().optional(),
  occurredAt: z.string().datetime(),
  lieu: z.string().trim().min(1).max(200),
  poste: z.string().trim().max(120).nullable().optional(),
  voie: z.string().trim().max(60).nullable().optional(),
  observations: z.string().trim().max(2000).nullable().optional(),
  // Localisation officielle choisie une fois pour tout le livret.
  gareMode: z.enum(GARE_MODES).nullable().optional(),
  gareUnique: z.string().trim().max(120).nullable().optional(),
  gareA: z.string().trim().max(120).nullable().optional(),
  gareB: z.string().trim().max(120).nullable().optional(),
  voies: z.string().trim().max(120).nullable().optional(),
  km: z.string().trim().max(60).nullable().optional(),
  acLabel: z.string().trim().max(120).nullable().optional(),
  motif: z.string().trim().max(300).nullable().optional(),
  cilNom: z.string().trim().max(120).nullable().optional(),
  cilPrenom: z.string().trim().max(120).nullable().optional(),
  cilEtablissement: z.enum(ETABLISSEMENTS).nullable().optional(),
  designatedAt: z.string().datetime().nullable().optional(),
  /// Lien direct vers la session décrivant le même événement (Livret ouvert
  /// depuis une session). On ne relie qu'à une session déjà accessible.
  sessionId: z.string().cuid().nullable().optional(),
  /// Livret ouvert depuis un RCI : on rattache le RCI à ce nouveau Livret
  /// (`Rci.cilIncidentId`) et le Livret hérite de la session du RCI s'il en a
  /// une, pour garder le triangle 1:1:1 cohérent.
  rciId: z.string().cuid().nullable().optional(),
});

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Référence normée JJMMAAHHMM-Lieu (non unique, comme le RCI). */
function buildReference(occurredAt: Date, lieu: string): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    p(occurredAt.getDate()) +
    p(occurredAt.getMonth() + 1) +
    String(occurredAt.getFullYear()).slice(2) +
    p(occurredAt.getHours()) +
    p(occurredAt.getMinutes());
  return `${stamp}-${slug(lieu) || "incident"}`;
}

/** Crée un incident OPEN + l'événement INCIDENT_CREATED (transaction). */
export async function POST(req: Request) {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const teamId = parsed.data.teamId ?? u.teamId ?? u.teamIds[0] ?? null;
  if (!teamId) {
    return NextResponse.json(
      { error: "Aucune équipe rattachée à l'utilisateur." },
      { status: 400 },
    );
  }
  if (!u.teamIds.includes(teamId) && u.role !== "ADMIN") {
    return NextResponse.json({ error: "Équipe hors scope" }, { status: 403 });
  }
  // Rattachement à la session : réservé à une session déjà consultable.
  if (parsed.data.sessionId) {
    const s = await prisma.ficheSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true, createdByUserId: true },
    });
    if (!s || !assertTeamAccess(u, { authorId: s.createdByUserId })) {
      return NextResponse.json(
        { error: "Session inconnue ou inaccessible" },
        { status: 404 },
      );
    }
  }

  // Livret ouvert depuis un RCI : on vérifie l'accès et on récupère sa session
  // pour la faire hériter au Livret (triangle 1:1:1). Un RCI finalisé est en
  // lecture seule : on refuse de le rattacher.
  let rciToLink: { id: string; sessionId: string | null } | null = null;
  if (parsed.data.rciId) {
    const rci = await prisma.rci.findUnique({
      where: { id: parsed.data.rciId },
      select: { id: true, authorId: true, sessionId: true, status: true },
    });
    if (!rci || !assertTeamAccess(u, rci)) {
      return NextResponse.json(
        { error: "RCI inconnu ou inaccessible" },
        { status: 404 },
      );
    }
    if (rci.status === "FINAL") {
      return NextResponse.json(
        { error: "RCI finalisé, lecture seule." },
        { status: 409 },
      );
    }
    rciToLink = { id: rci.id, sessionId: rci.sessionId };
  }

  // La session du Livret : celle passée explicitement, sinon celle du RCI.
  const effectiveSessionId =
    parsed.data.sessionId ?? rciToLink?.sessionId ?? null;

  const occurredAt = new Date(parsed.data.occurredAt);
  const created = await prisma.$transaction(async (tx) => {
    const incident = await tx.cilIncident.create({
      data: {
        teamId,
        authorId: u.id,
        status: "OPEN",
        reference: buildReference(occurredAt, parsed.data.lieu),
        type: parsed.data.type,
        typeLibre: parsed.data.typeLibre ?? null,
        occurredAt,
        lieu: parsed.data.lieu,
        poste: parsed.data.poste ?? null,
        voie: parsed.data.voie ?? null,
        observations: parsed.data.observations ?? null,
        gareMode: parsed.data.gareMode ?? null,
        gareUnique: parsed.data.gareUnique ?? null,
        gareA: parsed.data.gareA ?? null,
        gareB: parsed.data.gareB ?? null,
        voies: parsed.data.voies ?? null,
        km: parsed.data.km ?? null,
        acLabel: parsed.data.acLabel ?? null,
        motif: parsed.data.motif ?? null,
        cilNom: parsed.data.cilNom ?? null,
        cilPrenom: parsed.data.cilPrenom ?? null,
        cilEtablissement: parsed.data.cilEtablissement ?? null,
        designatedAt: parsed.data.designatedAt
          ? new Date(parsed.data.designatedAt)
          : null,
        sessionId: effectiveSessionId,
      },
    });
    await createEvent(tx, {
      incidentId: incident.id,
      type: "INCIDENT_CREATED",
      occurredAt,
      label: "Incident créé",
      actorId: u.id,
      actorName: u.name,
    });
    // Referme le lien RCI → Livret côté RCI.
    if (rciToLink) {
      await tx.rci.update({
        where: { id: rciToLink.id },
        data: { cilIncidentId: incident.id },
      });
    }
    return incident;
  });

  return NextResponse.json(created);
}
