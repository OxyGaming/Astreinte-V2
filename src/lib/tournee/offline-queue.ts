/**
 * File hors ligne des événements de tournée — module client uniquement.
 *
 * Réutilise la file IndexedDB commune (`pending_ops`, kind "tournee-event") :
 *   • l'écran terrain enfile chaque geste AVANT l'envoi (rien n'est perdu si
 *     le réseau manque ou si la page est rechargée) ;
 *   • l'envoi est groupé par réalisation et idempotent (clientOpId) : l'écran
 *     et OfflineSyncManager peuvent rejouer la même op sans doublon serveur.
 */
import { enqueue, getAll, getBySession, remove, update, type PendingOp } from "@/lib/idb-offline";
import type { TourneeEvent, TourneeEventType } from "./types";

type TourneeOp = Extract<PendingOp, { kind: "tournee-event" }>;
export type QueuedEvent = TourneeEvent & { clientOpId: string };

const isTourneeOp = (o: PendingOp): o is TourneeOp => o.kind === "tournee-event";

export async function enqueueTourneeEvents(realisationId: string, events: QueuedEvent[]): Promise<void> {
  for (const e of events) {
    await enqueue({
      kind: "tournee-event",
      sessionId: realisationId,
      clientOpId: e.clientOpId,
      payload: { type: e.type, etapeKey: e.etapeKey ?? null, at: e.at },
      createdAt: Date.now(),
      attempts: 0,
    });
  }
}

async function opsFor(realisationId: string): Promise<TourneeOp[]> {
  return (await getBySession(realisationId)).filter(isTourneeOp).sort((a, b) => a.payload.at - b.payload.at);
}

export async function pendingTourneeEvents(realisationId: string): Promise<QueuedEvent[]> {
  return (await opsFor(realisationId)).map((o) => ({
    type: o.payload.type as TourneeEventType,
    etapeKey: o.payload.etapeKey,
    at: o.payload.at,
    clientOpId: o.clientOpId,
  }));
}

export type FlushResult = { sent: number; offline?: boolean; refused?: string };

/** Envoie les événements en attente d'une réalisation (lot unique). */
export async function flushTourneeEvents(realisationId: string): Promise<FlushResult> {
  const ops = await opsFor(realisationId);
  if (!ops.length) return { sent: 0 };
  const batch = ops.slice(0, 50);
  try {
    const res = await fetch(`/api/tournees/realisations/${realisationId}/evenements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: batch.map((o) => ({ type: o.payload.type, etapeKey: o.payload.etapeKey, at: o.payload.at, clientOpId: o.clientOpId })),
      }),
    });
    if (res.ok || (res.status >= 400 && res.status < 500)) {
      // 2xx appliqué, 4xx refus définitif : on retire pour ne pas bloquer la file.
      await Promise.all(batch.map((o) => (o.id !== undefined ? remove(o.id) : undefined)));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { sent: 0, refused: data.error ?? `Refusé (HTTP ${res.status})` };
      }
      return { sent: batch.length };
    }
    await Promise.all(batch.map((o) => update({ ...o, attempts: o.attempts + 1, lastError: `HTTP ${res.status}` })));
    return { sent: 0, offline: true };
  } catch (err) {
    await Promise.all(batch.map((o) => update({ ...o, attempts: o.attempts + 1, lastError: String(err) })));
    return { sent: 0, offline: true };
  }
}

/** Rejeu global (OfflineSyncManager) : toutes les réalisations ayant des ops. */
export async function flushAllTourneeEvents(): Promise<void> {
  const ids = [...new Set((await getAll()).filter(isTourneeOp).map((o) => o.sessionId))];
  for (const id of ids) {
    const r = await flushTourneeEvents(id);
    if (r.offline) break;
  }
}
