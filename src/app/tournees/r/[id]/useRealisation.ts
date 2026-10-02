"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealisationView } from "@/lib/tournee/realisation";
import type { TourneeEventType } from "@/lib/tournee/types";
import { enqueueTourneeEvents, flushTourneeEvents, pendingTourneeEvents, type QueuedEvent } from "@/lib/tournee/offline-queue";

const POLL_MS = 15_000;

/**
 * État d'une réalisation côté terrain :
 *   • horloge recalée sur le serveur (les écarts sont comparés à des horaires absolus) ;
 *   • chaque geste est d'abord enfilé dans IndexedDB (file hors ligne commune),
 *     affiché immédiatement, puis envoyé : rien n'est perdu sans réseau ni au
 *     rechargement de la page ;
 *   • synchronisation périodique (polling) quand la page est visible — pas de
 *     technologie temps réel supplémentaire. Hors ligne, le service worker sert
 *     la dernière vue reçue.
 */
export function useRealisation(initial: RealisationView) {
  const id = initial.id;
  const [view, setView] = useState(initial);
  const offset = useRef(initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset.current);
  const [pending, setPending] = useState<QueuedEvent[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number>(initial.serverNow);
  const flushing = useRef(false);
  // Repli mémoire si IndexedDB est indisponible (navigation privée stricte…).
  const idbOk = useRef(true);
  const memQueue = useRef<QueuedEvent[]>([]);

  const clock = useCallback(() => Date.now() + offset.current, []);

  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(t);
  }, [clock]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournees/realisations/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as RealisationView;
      offset.current = data.serverNow - Date.now();
      setView(data);
      setLastSync(data.serverNow);
    } catch {
      /* hors ligne : on garde la dernière vue */
    }
  }, [id]);

  const loadPending = useCallback(async () => {
    if (!idbOk.current) {
      setPending([...memQueue.current]);
      return;
    }
    try {
      setPending(await pendingTourneeEvents(id));
    } catch {
      idbOk.current = false;
      setPending([...memQueue.current]);
    }
  }, [id]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let sent = 0;
      if (idbOk.current) {
        const r = await flushTourneeEvents(id);
        sent = r.sent;
        if (r.refused) setSyncError(r.refused);
        else if (r.offline) setSyncError("Hors ligne — vos actions sont conservées et seront envoyées au retour du réseau");
        else setSyncError(null);
        if (r.refused || sent) await refresh();
      } else if (memQueue.current.length) {
        const batch = memQueue.current;
        try {
          const res = await fetch(`/api/tournees/realisations/${id}/evenements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: batch }),
          });
          if (res.ok || (res.status >= 400 && res.status < 500)) {
            memQueue.current = memQueue.current.filter((e) => !batch.includes(e));
            setSyncError(res.ok ? null : "Action refusée");
            await refresh();
          }
        } catch {
          setSyncError(`Hors ligne — ${batch.length} action(s) en attente (garder la page ouverte)`);
        }
      }
      await loadPending();
    } finally {
      flushing.current = false;
    }
  }, [id, refresh, loadPending]);

  const emit = useCallback(
    (events: { type: TourneeEventType; etapeKey?: string | null }[]) => {
      const base = clock();
      // +1 ms par événement : garantit l'ordre (ex. début puis fin d'un passage instantané).
      const evs: QueuedEvent[] = events.map((e, i) => ({
        type: e.type,
        etapeKey: e.etapeKey ?? null,
        at: base + i,
        clientOpId: crypto.randomUUID(),
      }));
      setPending((p) => [...p, ...evs]);
      setNow(clock());
      const persist = idbOk.current
        ? enqueueTourneeEvents(id, evs).catch(() => {
            idbOk.current = false;
            memQueue.current.push(...evs);
          })
        : Promise.resolve(void memQueue.current.push(...evs));
      void persist.then(flush);
    },
    [id, clock, flush],
  );

  // Au montage : reprise des actions non envoyées + vue la plus récente
  // (la page peut avoir été servie depuis le cache du service worker).
  useEffect(() => {
    void loadPending().then(flush).then(refresh);
  }, [loadPending, flush, refresh]);

  // Polling + resynchronisation au retour sur la page / du réseau.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void flush().then(refresh);
    };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", tick);
    };
  }, [flush, refresh]);

  const me = view.participants.find((p) => p.id === view.me.participantId) ?? null;
  // Journal serveur + attentes locales, dédoublonnés par clientOpId (une op
  // peut avoir été envoyée par le rejeu global alors qu'elle est encore listée).
  const myEvents = useMemo(() => {
    if (!me) return [];
    const recus = new Set(me.events.map((e) => e.clientOpId).filter(Boolean));
    return [...me.events, ...pending.filter((p) => !recus.has(p.clientOpId))];
  }, [me, pending]);

  return { view, setView, now, emit, refresh, myEvents, me, pendingCount: pending.length, syncError, lastSync };
}
