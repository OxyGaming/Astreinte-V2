import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import { analyzeDeletion, type TriangleEntityKind } from "@/lib/triangle";

const KINDS: TriangleEntityKind[] = ["rci", "cil", "session"];

/**
 * GET /api/triangle/deletion-impact?type=<rci|cil|session>&id=<id>
 * Aperçu d'impact d'une suppression du triangle (admin-only, lecture seule).
 * Alimente la modale de confirmation avant tout DELETE.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");
  if (!type || !KINDS.includes(type as TriangleEntityKind) || !id) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const impact = await analyzeDeletion(prisma, type as TriangleEntityKind, id);
  if (!impact) {
    return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
  }
  return NextResponse.json(impact);
}
