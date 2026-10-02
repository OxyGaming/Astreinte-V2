/**
 * Domaine « réalisation » — serveur uniquement.
 * Création (copie figée du modèle), vue sérialisable, journal d'événements.
 */
import { prisma } from "@/lib/prisma";
import { calculerProgression } from "./planning";
import {
  buildPlanFromModele,
  genererCodePartage,
  loadEvenements,
  masquerPlan,
  nomUtilisateur,
  planOf,
  realisationAccess,
  refreshPlanContacts,
  type RealisationRow,
} from "./server";
import { isValidHHmm, isValidYmd, parisYmd } from "./time";
import {
  TOURNEE_EVENT_TYPES,
  type TourneeEvent,
  type TourneeEventType,
  type TourneeMode,
  type TourneePlan,
  type TourneeRealisationStatut,
} from "./types";

type U = { id: string; role: string };

export class TourneeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ─── Création ─────────────────────────────────────────────────────────────────

export async function creerRealisation(
  user: U,
  input: { modeleId: string; mode: TourneeMode; date?: string; heureDepart?: string; clientOpId?: string },
): Promise<{ id: string }> {
  if (input.clientOpId) {
    const dup = await prisma.tourneeRealisation.findUnique({ where: { clientOpId: input.clientOpId }, select: { id: true } });
    if (dup) return dup;
  }
  const modele = await prisma.tourneeModele.findUnique({ where: { id: input.modeleId }, select: { statut: true } });
  if (!modele) throw new TourneeError(404, "Modèle introuvable");
  if (modele.statut !== "PUBLIE" && user.role !== "ADMIN") throw new TourneeError(403, "Ce modèle n'est pas publié");
  if (input.mode !== "SOLO" && input.mode !== "EQUIPE") throw new TourneeError(400, "Mode invalide");

  const plan = await buildPlanFromModele(input.modeleId);
  if (!plan) throw new TourneeError(404, "Modèle introuvable");
  const date = input.date && isValidYmd(input.date) ? input.date : parisYmd(Date.now());
  const heureDepart = input.heureDepart && isValidHHmm(input.heureDepart) ? input.heureDepart : plan.heureDepart;

  const r = await prisma.tourneeRealisation.create({
    data: {
      modeleId: input.modeleId,
      modeleVersion: plan.version,
      planSnapshot: JSON.stringify(plan),
      mode: input.mode,
      titre: plan.titre,
      date,
      heureDepart,
      codePartage: input.mode === "EQUIPE" ? await genererCodePartage() : null,
      createdById: user.id,
      clientOpId: input.clientOpId ?? null,
      participants: { create: { userId: user.id, role: "REFERENT" } },
    },
    select: { id: true },
  });
  return r;
}

// ─── Rejoindre (équipe) ───────────────────────────────────────────────────────

/** Ajoute l'utilisateur comme participant (idempotent). */
export async function rejoindreRealisation(user: U, r: RealisationRow): Promise<void> {
  if (r.mode !== "EQUIPE") throw new TourneeError(400, "Seules les tournées d'équipe peuvent être rejointes");
  if (r.statut === "TERMINEE" || r.statut === "ANNULEE") throw new TourneeError(409, "Cette tournée est clôturée");
  if (r.participants.some((p) => p.userId === user.id)) return;
  await prisma.tourneeParticipant.upsert({
    where: { realisationId_userId: { realisationId: r.id, userId: user.id } },
    create: { realisationId: r.id, userId: user.id, role: "PARTICIPANT" },
    update: {},
  });
}

// ─── Vue sérialisable (page + polling) ────────────────────────────────────────

export interface ParticipantView {
  id: string;
  userId: string;
  nom: string;
  role: "REFERENT" | "PARTICIPANT";
  joinedAt: number;
  events: TourneeEvent[];
}

export interface RealisationView {
  id: string;
  titre: string;
  mode: TourneeMode;
  statut: TourneeRealisationStatut;
  date: string;
  heureDepart: string;
  modeleId: string | null;
  codePartage: string | null;
  createdByNom: string;
  plan: TourneePlan;
  participants: ParticipantView[];
  me: { userId: string; participantId: string | null; isReferent: boolean; canJoin: boolean };
  serverNow: number;
}

export async function buildRealisationView(user: U, r: RealisationRow): Promise<RealisationView> {
  const access = realisationAccess(user, r);
  if (!access.canView) throw new TourneeError(403, "Accès refusé");
  const raw = planOf(r);
  if (!raw) throw new TourneeError(500, "Copie du parcours illisible");
  const plan = masquerPlan({ ...raw, contacts: await refreshPlanContacts(raw.contacts) }, access.canSeeHidden);
  const events = await loadEvenements(r.id);
  return {
    id: r.id,
    titre: r.titre,
    mode: r.mode as TourneeMode,
    statut: r.statut as TourneeRealisationStatut,
    date: r.date,
    heureDepart: r.heureDepart,
    modeleId: r.modeleId,
    codePartage: r.mode === "EQUIPE" ? r.codePartage : null,
    createdByNom: nomUtilisateur(r.createdBy),
    plan,
    participants: r.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      nom: nomUtilisateur(p.user),
      role: p.role as ParticipantView["role"],
      joinedAt: p.joinedAt.getTime(),
      events: events.get(p.id) ?? [],
    })),
    me: {
      userId: user.id,
      participantId: access.participant?.id ?? null,
      isReferent: access.isReferent,
      canJoin: r.mode === "EQUIPE" && !access.participant && (r.statut === "PREPARATION" || r.statut === "EN_COURS"),
    },
    serverNow: Date.now(),
  };
}

// ─── Journal d'événements ─────────────────────────────────────────────────────

export interface EventInput {
  type: TourneeEventType;
  etapeKey?: string | null;
  at: number;
  clientOpId?: string;
}

const MAX_AVANCE_MS = 2 * 60_000;

export function validerEvents(raw: unknown, plan: TourneePlan): EventInput[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) throw new TourneeError(400, "Liste d'événements invalide");
  const keys = new Set(plan.etapes.map((e) => e.key));
  const now = Date.now();
  return raw.map((e, i) => {
    const o = (e ?? {}) as Record<string, unknown>;
    const type = o.type as TourneeEventType;
    if (!(TOURNEE_EVENT_TYPES as readonly string[]).includes(type)) throw new TourneeError(400, `Événement ${i + 1} : type invalide`);
    const etapeKey = typeof o.etapeKey === "string" ? o.etapeKey : null;
    if (type.startsWith("ETAPE_") && (!etapeKey || !keys.has(etapeKey))) {
      throw new TourneeError(400, `Événement ${i + 1} : étape inconnue`);
    }
    let at = typeof o.at === "number" && Number.isFinite(o.at) ? o.at : now;
    // Horloge du terminal : on borne les dérives aberrantes vers le futur.
    if (at > now + MAX_AVANCE_MS) at = now;
    return {
      type,
      etapeKey: type.startsWith("ETAPE_") ? etapeKey : null,
      at,
      clientOpId: typeof o.clientOpId === "string" && o.clientOpId.length <= 64 ? o.clientOpId : undefined,
    };
  });
}

/**
 * Enregistre des événements pour le participant courant (idempotent par
 * clientOpId), met à jour la projection du participant et le statut de la
 * réalisation (lancement solo / fin solo).
 */
export async function ajouterEvenements(user: U, r: RealisationRow, raw: unknown): Promise<{ added: number }> {
  const access = realisationAccess(user, r);
  if (!access.participant) throw new TourneeError(403, "Vous ne participez pas à cette tournée");
  if (r.statut === "TERMINEE" || r.statut === "ANNULEE") throw new TourneeError(409, "Tournée clôturée");
  const plan = planOf(r);
  if (!plan) throw new TourneeError(500, "Copie du parcours illisible");
  if (r.statut === "PREPARATION" && r.mode === "EQUIPE") {
    throw new TourneeError(409, "La tournée n'a pas encore été lancée par le référent");
  }
  const events = validerEvents(raw, plan);
  const participantId = access.participant.id;

  const ops = events.map((e) => e.clientOpId).filter(Boolean) as string[];
  const deja = ops.length
    ? new Set((await prisma.tourneeEvenement.findMany({ where: { clientOpId: { in: ops } }, select: { clientOpId: true } })).map((x) => x.clientOpId))
    : new Set<string | null>();
  const nouveaux = events.filter((e) => !e.clientOpId || !deja.has(e.clientOpId));

  await prisma.$transaction(async (tx) => {
    if (nouveaux.length) {
      await tx.tourneeEvenement.createMany({
        data: nouveaux.map((e) => ({
          realisationId: r.id,
          participantId,
          type: e.type,
          etapeKey: e.etapeKey ?? null,
          occurredAt: new Date(e.at),
          clientOpId: e.clientOpId ?? null,
        })),
      });
    }
    // Projection du participant (vue équipe) recalculée depuis tout son journal.
    const all = await tx.tourneeEvenement.findMany({
      where: { participantId },
      orderBy: [{ occurredAt: "asc" }, { recordedAt: "asc" }],
    });
    const prog = calculerProgression(
      plan.etapes,
      all.map((x) => ({ type: x.type as TourneeEventType, etapeKey: x.etapeKey, at: x.occurredAt.getTime() })),
    );
    const courante = prog.enCoursKey ?? prog.prochaineKey;
    await tx.tourneeParticipant.update({
      where: { id: participantId },
      data: {
        startedAt: prog.debutTournee ? new Date(prog.debutTournee) : null,
        finishedAt: prog.finTournee ? new Date(prog.finTournee) : null,
        etapeCouranteKey: courante,
        etapeCouranteDepuis: prog.enCoursKey ? new Date(prog.etats.get(prog.enCoursKey)!.debut!) : null,
      },
    });
    const data: { statut?: string; startedAt?: Date; endedAt?: Date } = {};
    if (r.statut === "PREPARATION" && prog.demarre) {
      data.statut = "EN_COURS";
      data.startedAt = new Date(prog.debutTournee!);
    }
    if (r.mode === "SOLO" && prog.termine) {
      data.statut = "TERMINEE";
      data.endedAt = new Date(prog.finTournee!);
    }
    if (Object.keys(data).length) await tx.tourneeRealisation.update({ where: { id: r.id }, data });
  });
  return { added: nouveaux.length };
}
