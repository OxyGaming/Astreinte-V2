/**
 * GET /api/admin/postes — liste tous les postes (données brutes DB)
 * POST /api/admin/postes — crée un poste (normalise l'annuaire vers le format pivot)
 *
 * Note GET : retourne les champs JSON (annuaire, circuitsVoie, …) sous forme de strings
 * brutes telles que stockées en DB. Pour un export résolu de l'annuaire, utiliser
 * GET /api/admin/postes/[id]/annuaire?mode=metier
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { normalizeAnnuaire } from "@/lib/annuaire";

function toJsonString(value: unknown, fallback: unknown[] = []): string {
  if (typeof value === "string") {
    // Accepte une string JSON valide telle quelle
    try { JSON.parse(value); return value; } catch { return JSON.stringify(fallback); }
  }
  return JSON.stringify(value ?? fallback);
}

export async function GET() {
  const postes = await prisma.poste.findMany({
    orderBy: { nom: "asc" },
    include: {
      secteurs: { include: { secteur: { select: { id: true, slug: true, nom: true } } } },
    },
  });
  return NextResponse.json(postes);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé — rôle ADMIN requis" }, { status: 403 });
  }

  const body = await req.json();
  const {
    slug, nom, typePoste, lignes, adresse, horaires, electrification, systemeBlock,
    annuaire, circuitsVoie, pnSensibles, particularites, proceduresCles, dbc, rex, secteurIds,
  } = body;

  if (!slug || !nom || !typePoste || !adresse || !horaires || !electrification || !systemeBlock) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  // Normalisation de l'annuaire vers le format pivot AnnuaireEntry[]
  // Tolère AnnuaireSection[] (legacy), AnnuaireEntry[] (pivot), JSON string, ou vide
  const rawAnnuaire = typeof annuaire === "string"
    ? (() => { try { return JSON.parse(annuaire); } catch { return []; } })()
    : (annuaire ?? []);
  const normalizedAnnuaire = normalizeAnnuaire(rawAnnuaire);

  const ids: string[] = Array.isArray(secteurIds) ? secteurIds : [];

  const poste = await prisma.poste.create({
    data: {
      slug, nom, typePoste, adresse, horaires, electrification, systemeBlock,
      lignes:        toJsonString(lignes, []),
      annuaire:      JSON.stringify(normalizedAnnuaire),  // toujours format pivot
      circuitsVoie:  toJsonString(circuitsVoie, []),
      pnSensibles:   toJsonString(pnSensibles, []),
      particularites: toJsonString(particularites, []),
      proceduresCles: toJsonString(proceduresCles, []),
      dbc:  dbc  ? toJsonString(dbc,  []) : null,
      rex:  rex  ? toJsonString(rex,  []) : null,
      secteurs: ids.length > 0 ? { create: ids.map((secteurId) => ({ secteurId })) } : undefined,
    },
  });

  return NextResponse.json(poste, { status: 201 });
}
