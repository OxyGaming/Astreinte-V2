import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'Champ "ids" manquant ou non-tableau' }, { status: 400 });
  }
  const ids = (body.ids as unknown[]).filter((x): x is string => typeof x === "string");

  await prisma.$transaction(
    ids.map((id, i) => prisma.lienCategorie.update({ where: { id }, data: { ordre: i } }))
  );

  return NextResponse.json({ success: true });
}
