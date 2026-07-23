import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, teamScope, assertTeamAccess } from "@/lib/auth";

/**
 * Liste des RCI visibles par l'utilisateur (scope équipe).
 * Drafts en premier, puis finalisés. Tri stable sur updatedAt desc.
 */
export async function GET() {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const rcis = await prisma.rci.findMany({
    where: { ...teamScope(u) },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    // Portage : ni `Team` ni `Photo` dans cette application.
    include: {
      author: { select: { id: true, nom: true, prenom: true } },
    },
  });
  return NextResponse.json(rcis);
}

const createSchema = z.object({
  teamId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  /// Rattachement à la source terrain dès la création (RCI ouvert depuis une
  /// session ou un Livret CIL). On ne relie qu'à une ressource déjà accessible.
  cilIncidentId: z.string().cuid().optional(),
  sessionId: z.string().cuid().optional(),
});

/**
 * Crée un brouillon vide. teamId par défaut = équipe principale de l'utilisateur,
 * sinon la première de ses memberships. L'auteur courant est enregistré.
 */
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
      { status: 400 }
    );
  }
  const teamId =
    parsed.data.teamId ?? u.teamId ?? u.teamIds[0] ?? null;
  if (!teamId) {
    return NextResponse.json(
      { error: "Aucune équipe rattachée à l'utilisateur." },
      { status: 400 }
    );
  }
  if (!u.teamIds.includes(teamId) && u.role !== "ADMIN") {
    return NextResponse.json({ error: "Équipe hors scope" }, { status: 403 });
  }
  // On ne rattache qu'à une source que l'utilisateur peut déjà consulter, sinon
  // le lien deviendrait un canal de lecture détourné (même règle que le PATCH).
  if (parsed.data.cilIncidentId) {
    const cil = await prisma.cilIncident.findUnique({
      where: { id: parsed.data.cilIncidentId },
      select: { id: true, authorId: true },
    });
    if (!cil || !assertTeamAccess(u, cil)) {
      return NextResponse.json(
        { error: "Incident CIL inconnu ou inaccessible" },
        { status: 404 },
      );
    }
  }
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
  const created = await prisma.rci.create({
    data: {
      teamId,
      authorId: u.id,
      status: "DRAFT",
      title: parsed.data.title ?? null,
      cilIncidentId: parsed.data.cilIncidentId ?? null,
      sessionId: parsed.data.sessionId ?? null,
    },
  });
  return NextResponse.json(created);
}
