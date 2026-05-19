import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { getDocumentPath } from "@/lib/documents";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(getDocumentPath(id));
  } catch {
    return NextResponse.json({ error: "Fichier physique introuvable" }, { status: 404 });
  }

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const disposition = inline ? "inline" : "attachment";
  const encodedName = encodeURIComponent(document.originalName);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.size),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-cache",
    },
  });
}
