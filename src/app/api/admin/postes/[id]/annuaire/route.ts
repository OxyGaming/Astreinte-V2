/**
 * GET  /api/admin/postes/[id]/annuaire          — export technique (format pivot)
 * GET  /api/admin/postes/[id]/annuaire?mode=metier — export métier (contacts résolus)
 * PUT  /api/admin/postes/[id]/annuaire          — sauvegarde
 *
 * Format pivot officiel : AnnuaireEntry[] — cf. src/lib/annuaire.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { normalizeAnnuaire, validateAnnuaire, resolveAnnuaireMetier } from "@/lib/annuaire";

type Params = { params: Promise<{ id: string }> };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function getAuth() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) return null;
  return user;
}

// ─── GET — Export ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const mode = new URL(req.url).searchParams.get("mode") ?? "technique";

  const poste = await prisma.poste.findUnique({
    where: { id },
    select: { id: true, nom: true, annuaire: true },
  });
  if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

  // Normalisation systématique vers le format pivot
  const entries = normalizeAnnuaire(parseJson(poste.annuaire, []));

  // ── Export technique ──────────────────────────────────────────────────────
  if (mode !== "metier") {
    return NextResponse.json({
      posteId: id,
      posteNom: poste.nom,
      mode: "technique",
      count: entries.length,
      entries,
    });
  }

  // ── Export métier — résolution live des contacts liés ─────────────────────
  const contactIds = entries.filter((e) => e.contactId).map((e) => e.contactId!);
  const contacts =
    contactIds.length > 0
      ? await prisma.contact.findMany({
          where: { id: { in: contactIds } },
          select: { id: true, nom: true, role: true, telephone: true, telephoneAlt: true, disponibilite: true },
        })
      : [];

  const resolved = resolveAnnuaireMetier(entries, contacts);

  // Warnings non-bloquants (contactId orphelins, etc.)
  const knownIds = new Set(contacts.map((c) => c.id));
  const warnings = validateAnnuaire(entries, knownIds);

  return NextResponse.json({
    posteId: id,
    posteNom: poste.nom,
    mode: "metier",
    count: resolved.length,
    entries: resolved,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}

// ─── PUT — Sauvegarde ─────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;

    const poste = await prisma.poste.findUnique({ where: { id }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.annuaire) && typeof body.annuaire !== "string") {
      return NextResponse.json({ error: 'Champ "annuaire" manquant (tableau ou chaîne JSON attendue)' }, { status: 400 });
    }

    // Normalisation tolérante : accepte AnnuaireSection[] (legacy), AnnuaireEntry[], ou JSON string
    const raw = typeof body.annuaire === "string"
      ? parseJson(body.annuaire, [])
      : body.annuaire;

    const normalized = normalizeAnnuaire(raw);

    // Validation optionnelle des contactIds (warnings non-bloquants)
    const linkedIds = normalized.filter((e) => e.contactId).map((e) => e.contactId!);
    let warnings: ReturnType<typeof validateAnnuaire> = [];
    if (linkedIds.length > 0) {
      const found = await prisma.contact.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true },
      });
      const knownIds = new Set(found.map((c) => c.id));
      warnings = validateAnnuaire(normalized, knownIds);
    }

    await prisma.poste.update({
      where: { id },
      data: { annuaire: JSON.stringify(normalized) },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({
      success: true,
      count: normalized.length,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour de l'annuaire" }, { status: 500 });
  }
}
