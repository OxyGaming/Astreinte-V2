/**
 * POST /api/cron/archive-events
 *
 * Déclenche le batch d'archivage des événements de sessions procédures.
 * Protégé par un secret partagé transmis dans le header X-Cron-Secret.
 *
 * Utilisation :
 *   curl -X POST https://<host>/api/cron/archive-events \
 *        -H "X-Cron-Secret: <valeur de CRON_SECRET>"
 *
 * Variable d'environnement requise : CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { runArchiveBatch } from "@/lib/jobs/archiveSessionEvents";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET) {
    console.error("[archive:cron] Variable CRON_SECRET manquante dans l'environnement.");
    return NextResponse.json({ error: "Configuration serveur incorrecte" }, { status: 500 });
  }

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await runArchiveBatch();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[archive:cron] Erreur non gérée dans runArchiveBatch :", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
