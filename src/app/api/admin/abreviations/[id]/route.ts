import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const a = await prisma.abreviation.findUnique({ where: { id } });
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(a);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { sigle, definition } = body;
  const a = await prisma.abreviation.update({
    where: { id },
    data: { sigle: sigle.toUpperCase(), definition },
  });
  return NextResponse.json(a);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.abreviation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
