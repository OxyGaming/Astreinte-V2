import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardContributionManager, userLabel } from "@/lib/tournee/http";
import { CONTRIBUTION_STATUT_LABELS, isContributionStatut } from "@/lib/tournee/contributions";
import { isValidYmd } from "@/lib/tournee/time";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH — traitement administratif (ADMIN + EDITOR) :
 *   { statut?, assigneeId? (null = aucune), traiteLe? ("YYYY-MM-DD" | null), commentaire? }
 * Chaque changement est tracé dans l'historique (append-only), dans la même transaction.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guardContributionManager();
  if (g.error) return g.error;
  const { id } = await params;
  const c = await prisma.tourneeContribution.findUnique({
    where: { id },
    include: { assignee: { select: { prenom: true, nom: true } } },
  });
  if (!c) return NextResponse.json({ error: "Contribution introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const actor = { actorId: g.user.id, actorNom: userLabel(g.user) };
  const histo: { type: string; ancienneValeur?: string | null; nouvelleValeur?: string | null; message?: string | null }[] = [];
  const data: { statut?: string; assigneeId?: string | null; traiteLe?: Date | null } = {};

  if (body.statut !== undefined && body.statut !== c.statut) {
    const statut: unknown = body.statut;
    if (!isContributionStatut(statut)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    data.statut = statut;
    histo.push({
      type: "STATUT",
      ancienneValeur: isContributionStatut(c.statut) ? CONTRIBUTION_STATUT_LABELS[c.statut] : c.statut,
      nouvelleValeur: CONTRIBUTION_STATUT_LABELS[statut],
    });
  }

  if (body.assigneeId !== undefined && (body.assigneeId || null) !== c.assigneeId) {
    const nouvel = body.assigneeId
      ? await prisma.user.findFirst({ where: { id: String(body.assigneeId), actif: true }, select: { id: true, prenom: true, nom: true } })
      : null;
    if (body.assigneeId && !nouvel) return NextResponse.json({ error: "Utilisateur introuvable ou inactif" }, { status: 400 });
    data.assigneeId = nouvel?.id ?? null;
    histo.push({
      type: "AFFECTATION",
      ancienneValeur: c.assignee ? `${c.assignee.prenom} ${c.assignee.nom}` : null,
      nouvelleValeur: nouvel ? `${nouvel.prenom} ${nouvel.nom}` : null,
    });
  }

  if (body.traiteLe !== undefined) {
    if (body.traiteLe !== null && !isValidYmd(body.traiteLe)) return NextResponse.json({ error: "Date de traitement invalide" }, { status: 400 });
    const nouvelle = body.traiteLe ? new Date(`${body.traiteLe}T12:00:00Z`) : null;
    const ancienne = c.traiteLe?.toISOString().slice(0, 10) ?? null;
    if ((body.traiteLe ?? null) !== ancienne) {
      data.traiteLe = nouvelle;
      histo.push({ type: "DATE_TRAITEMENT", ancienneValeur: ancienne, nouvelleValeur: body.traiteLe ?? null });
    }
  }

  const commentaire = typeof body.commentaire === "string" ? body.commentaire.trim() : "";
  if (commentaire.length > 5000) return NextResponse.json({ error: "Commentaire trop long" }, { status: 400 });
  if (commentaire) histo.push({ type: "COMMENTAIRE", message: commentaire });

  if (!histo.length) return NextResponse.json({ error: "Aucune modification" }, { status: 400 });

  await prisma.$transaction([
    prisma.tourneeContribution.update({ where: { id }, data }),
    prisma.tourneeContributionHistorique.createMany({ data: histo.map((h) => ({ ...h, ...actor, contributionId: id })) }),
  ]);
  return NextResponse.json({ success: true });
}
