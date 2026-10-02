/**
 * Accès données + règles d'autorisation du module Tournée — serveur uniquement.
 *
 * Droits (validés) :
 *   • Modèles               → ADMIN (back-office)
 *   • Réalisation SOLO      → son créateur ; ADMIN/EDITOR en lecture (supervision)
 *   • Réalisation ÉQUIPE    → listée et consultable par tout utilisateur connecté,
 *                             rejoignable (lien / code) ; le RÉFÉRENT (rôle porté
 *                             par TourneeParticipant) organise et gère la session
 *   • Contributions         → création : tout participant ; traitement : ADMIN + EDITOR
 */
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveLiens } from "@/lib/db";
import { parseLienRefs } from "@/lib/liens";
import { parseAPropos, parseBlocs, parseContacts, parsePlan, parseSeuils } from "./parse";
import type { TourneeEvent, TourneeEventType, TourneePlan, TourneePlanContact, TourneePlanLien } from "./types";

type U = { id: string; role: string };

export const canManageModeles = (u: U | null) => u?.role === "ADMIN";
export const canManageContributions = (u: U | null) => u?.role === "ADMIN" || u?.role === "EDITOR";

export const nomUtilisateur = (u: { prenom: string; nom: string; username?: string }) =>
  `${u.prenom} ${u.nom}`.trim() || u.username || "Utilisateur";

// ─── Copie figée ──────────────────────────────────────────────────────────────

async function resolvePlanLiens(raw: string | null): Promise<TourneePlanLien[]> {
  const resolved = await resolveLiens(parseLienRefs(raw));
  return resolved.filter((l) => !l.orphan && l.url).map((l) => ({ libelle: l.libelle, url: l.url }));
}

/** Résout les contacts du modèle (contact lié → nom / téléphone actuels). */
export async function resolveContacts(raw: string | null): Promise<TourneePlanContact[]> {
  const refs = parseContacts(raw);
  const ids = refs.filter((r) => r.contactId).map((r) => r.contactId!);
  const contacts = ids.length ? await prisma.contact.findMany({ where: { id: { in: ids } } }) : [];
  const byId = new Map(contacts.map((c) => [c.id, c]));
  return refs.map((r) => {
    const c = r.contactId ? byId.get(r.contactId) : undefined;
    return {
      fonction: r.fonction,
      nom: r.nom ?? c?.nom ?? "",
      telephone: r.telephone ?? c?.telephone ?? "",
      contactId: c?.id,
    };
  });
}

/** Rafraîchit les contacts liés d'un plan figé (numéros à jour). */
export async function refreshPlanContacts(contacts: TourneePlanContact[]): Promise<TourneePlanContact[]> {
  const ids = contacts.filter((c) => c.contactId).map((c) => c.contactId!);
  if (!ids.length) return contacts;
  const rows = await prisma.contact.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((c) => [c.id, c]));
  return contacts.map((c) => {
    const live = c.contactId ? byId.get(c.contactId) : undefined;
    return live ? { ...c, telephone: live.telephone || c.telephone } : c;
  });
}

/** Construit le plan (copie figée) d'un modèle. */
export async function buildPlanFromModele(modeleId: string): Promise<TourneePlan | null> {
  const m = await prisma.tourneeModele.findUnique({
    where: { id: modeleId },
    include: {
      etapes: {
        orderBy: { ordre: "asc" },
        include: { photos: { where: { kind: "PHOTO" }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] } },
      },
    },
  });
  if (!m) return null;
  return {
    modeleId: m.id,
    version: m.version,
    titre: m.titre,
    sousTitre: m.sousTitre,
    description: m.description,
    objectif: m.objectif,
    aPropos: parseAPropos(m.aPropos),
    heureDepart: m.heureDepart,
    seuils: parseSeuils(m.seuils),
    contacts: await resolveContacts(m.contacts),
    liens: await resolvePlanLiens(m.liens),
    mentionDiffusion: m.mentionDiffusion,
    etapes: await Promise.all(
      m.etapes.map(async (e) => ({
        key: e.id,
        type: e.type as TourneePlan["etapes"][number]["type"],
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
        liens: await resolvePlanLiens(e.liens),
        contenu: parseBlocs(e.contenu),
        photos: e.photos.map((p) => ({ id: p.id, caption: p.caption })),
      })),
    ),
  };
}

/** Masque les localisations « non communiquées » pour un lecteur non habilité. */
export function masquerPlan(plan: TourneePlan, peutVoirMasque: boolean): TourneePlan {
  if (peutVoirMasque) return plan;
  return {
    ...plan,
    etapes: plan.etapes.map((e) =>
      e.localisationMasquee
        ? {
            ...e,
            adresse: null,
            latitude: null,
            longitude: null,
            contenu: e.contenu.map((b) => ({ ...b, lieu: null })),
          }
        : e,
    ),
  };
}

// ─── Code de partage ──────────────────────────────────────────────────────────

/** Alphabet sans caractères ambigus (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function normaliserCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function genererCodePartage(): Promise<string> {
  for (let tentative = 0; tentative < 10; tentative++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const existe = await prisma.tourneeRealisation.findUnique({ where: { codePartage: code }, select: { id: true } });
    if (!existe) return code;
  }
  throw new Error("Impossible de générer un code de partage unique");
}

// ─── Lecture d'une réalisation ────────────────────────────────────────────────

export async function loadRealisation(id: string) {
  return prisma.tourneeRealisation.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, nom: true, prenom: true, username: true } },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { id: true, nom: true, prenom: true, username: true } } },
      },
    },
  });
}
export type RealisationRow = NonNullable<Awaited<ReturnType<typeof loadRealisation>>>;

export interface RealisationAccess {
  canView: boolean;
  participant: RealisationRow["participants"][number] | null;
  isReferent: boolean;
  /** Peut voir les localisations masquées (référent, ADMIN). */
  canSeeHidden: boolean;
}

export function realisationAccess(user: U, r: RealisationRow): RealisationAccess {
  const participant = r.participants.find((p) => p.userId === user.id) ?? null;
  const isReferent = participant?.role === "REFERENT" || (r.mode === "SOLO" && r.createdById === user.id);
  const supervision = user.role === "ADMIN" || user.role === "EDITOR";
  const canView = r.mode === "EQUIPE" || !!participant || r.createdById === user.id || supervision;
  return { canView, participant, isReferent, canSeeHidden: isReferent || user.role === "ADMIN" };
}

/** Événements d'une réalisation regroupés par participant. */
export async function loadEvenements(realisationId: string): Promise<Map<string, TourneeEvent[]>> {
  const rows = await prisma.tourneeEvenement.findMany({
    where: { realisationId },
    orderBy: [{ occurredAt: "asc" }, { recordedAt: "asc" }],
  });
  const out = new Map<string, TourneeEvent[]>();
  for (const r of rows) {
    const list = out.get(r.participantId) ?? [];
    list.push({ type: r.type as TourneeEventType, etapeKey: r.etapeKey, at: r.occurredAt.getTime(), clientOpId: r.clientOpId });
    out.set(r.participantId, list);
  }
  return out;
}

export function planOf(r: { planSnapshot: string }): TourneePlan | null {
  return parsePlan(r.planSnapshot);
}
