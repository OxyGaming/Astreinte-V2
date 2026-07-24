import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertTeamAccess, requireUser } from "@/lib/auth";
import { reconcileTriangle, TriangleConflictError } from "@/lib/triangle";

// Portage : cette application n'a ni modèle `Team` ni modèle `Photo`.
// L'auteur est projeté depuis `prenom` / `nom` (pas de champ `name` ici).
async function loadRci(id: string) {
  return prisma.rci.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nom: true, prenom: true } },
    },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;
  const rci = await loadRci(id);
  if (!rci) return NextResponse.json({ error: "RCI inconnu" }, { status: 404 });
  if (!assertTeamAccess(u, rci)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return NextResponse.json(rci);
}

const patchSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  /// `true` = titre encore automatique (suit la Nature) ; `false` = personnalisé
  /// par l'agent (le titre devient prioritaire, plus d'écrasement par autosave).
  titleAuto: z.boolean().optional(),
  dossierNumber: z.string().trim().max(80).nullable().optional(),
  eventAt: z.string().datetime().nullable().optional(),
  /// Stringified JSON. Le serveur ne valide pas le contenu (libre côté wizard).
  payload: z.string().max(500_000).optional(),
  status: z.enum(["DRAFT", "FINAL"]).optional(),
  /// Rattachement à la source terrain. `null` détache.
  cilIncidentId: z.string().cuid().nullable().optional(),
  sessionId: z.string().cuid().nullable().optional(),
});

/**
 * Autosave partielle. Refuse les modifications si le RCI est FINAL (lecture seule).
 * Le passage DRAFT → FINAL est autorisé une fois ; FINAL → DRAFT non.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;
  const existing = await prisma.rci.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "RCI inconnu" }, { status: 404 });
  if (!assertTeamAccess(u, existing)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (existing.status === "FINAL") {
    return NextResponse.json(
      { error: "RCI finalisé, lecture seule." },
      { status: 409 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (parsed.data.payload !== undefined) {
    try {
      JSON.parse(parsed.data.payload);
    } catch {
      return NextResponse.json(
        { error: "payload doit être un JSON valide" },
        { status: 400 }
      );
    }
  }
  // Rattachement : on ne relie qu'à une source que l'utilisateur peut déjà
  // consulter, sinon le lien deviendrait un canal de lecture détourné.
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

  const data = {
    ...(parsed.data.cilIncidentId !== undefined
      ? { cilIncidentId: parsed.data.cilIncidentId }
      : {}),
    ...(parsed.data.sessionId !== undefined
      ? { sessionId: parsed.data.sessionId }
      : {}),
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.titleAuto !== undefined
      ? { titleAuto: parsed.data.titleAuto }
      : {}),
    ...(parsed.data.dossierNumber !== undefined
      ? { dossierNumber: parsed.data.dossierNumber }
      : {}),
    ...(parsed.data.eventAt !== undefined
      ? { eventAt: parsed.data.eventAt ? new Date(parsed.data.eventAt) : null }
      : {}),
    ...(parsed.data.payload !== undefined ? { payload: parsed.data.payload } : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
  };

  // Un RATTACHEMENT (session/Livret non nul) referme le triangle dans une
  // transaction ; un conflit de cohérence remonte en 409. L'autosave ordinaire
  // (titre, payload, détachement…) reste un simple update, sans surcoût.
  const linksTouched =
    (parsed.data.cilIncidentId != null) || (parsed.data.sessionId != null);
  if (!linksTouched) {
    const updated = await prisma.rci.update({ where: { id }, data });
    return NextResponse.json(updated);
  }
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.rci.update({ where: { id }, data });
      await reconcileTriangle(tx, {
        rciId: id,
        cilId: parsed.data.cilIncidentId ?? null,
        sessionId: parsed.data.sessionId ?? null,
      });
      return tx.rci.findUnique({ where: { id } });
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof TriangleConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
}

/**
 * Supprime un brouillon. Refuse si FINAL (intégrité de l'archive).
 * Les photos sont cascadées via la FK ON DELETE CASCADE du schéma.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  let u;
  try {
    u = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;
  const existing = await prisma.rci.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "RCI inconnu" }, { status: 404 });
  if (!assertTeamAccess(u, existing)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (existing.status === "FINAL") {
    return NextResponse.json(
      { error: "RCI finalisé, suppression interdite." },
      { status: 409 }
    );
  }
  await prisma.rci.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
