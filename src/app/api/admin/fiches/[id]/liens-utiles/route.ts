import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { normalizeLiensPayload } from "@/lib/liens-server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const fiche = await prisma.fiche.findUnique({ where: { id }, select: { id: true } });
  if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });

  const body = await req.json();
  const result = await normalizeLiensPayload(body?.liens);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await prisma.fiche.update({ where: { id }, data: { liens: result.json } });

  revalidatePath("/fiches");
  revalidatePath("/fiches/[slug]", "page");

  return NextResponse.json({ success: true, count: result.count });
}
