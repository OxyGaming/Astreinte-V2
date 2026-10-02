"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealisationView } from "@/lib/tournee/realisation";
import type { TourneeEvent, TourneeEventType } from "@/lib/tournee/types";

type PendingEvent = TourneeEvent & { clientOpId: string };

const POLL_MS = 15_000;

/**
 * État d'une réalisation côté terrain :
 *   • horloge recalée sur le serveur (les écarts sont comparés à des horaires absolus) ;
 *   • émission optimiste des événements + file de renvoi si le réseau manque ;
 *   • synchronisation périodique (polling) quand la page est visible — pas de
 *     technologie temps réel supplémentaire.
 */
export function useRealisation(initial: RealisationView) {
  const [view, setView] = useState(initial);
  const offset = useRef(initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset.current);
  const [pending, setPending] = useState<PendingEvent[]>([]);
  const pendingRef = useRef<PendingEvent[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number>(initial.serverNow);
  const flushing = useRef(false);

  const clock = useCallback(() => Date.now() + offset.current, []);

  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(t);
  }, [clock]);

  const setQueue = (q: PendingEvent[]) => {
    pendingRef.current = q;
    setPending(q);
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournees/realisations/${initial.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as RealisationView;
      offset.current = data.serverNow - Date.now();
      setView(data);
      setLastSync(data.serverNow);
    } catch {
      /* hors ligne : on garde la dernière vue */
    }
  }, [initial.id]);

  const flush = useCallback(async () => {
    if (flushing.current || pendingRef.current.length === 0) return;
    flushing.current = true;
    const batch = pendingRef.current;
    try {
      const res = await fetch(`/api/tournees/realisations/${initial.id}/evenements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // Succès, ou refus définitif (inutile de rejouer) : on retire le lot.
        setQueue(pendingRef.current.filter((p) => !batch.includes(p)));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSyncError(data.error ?? "Action refusée");
        } else setSyncError(null);
        await refresh();
      } else {
        setSyncError("Synchronisation en attente…");
      }
    } catch {
      setSyncError(`Hors ligne — ${batch.length} action(s) en attente d'envoi`);
    } finally {
      flushing.current = false;
    }
  }, [initial.id, refresh]);

  const emit = useCallback(
    (events: { type: TourneeEventType; etapeKey?: string | null }[]) => {
      const base = clock();
      // +1 ms par événement : garantit l'ordre (ex. début puis fin d'un passage instantané).
      const evs: PendingEvent[] = events.map((e, i) => ({
        type: e.type,
        etapeKey: e.etapeKey ?? null,
        at: base + i,
        clientOpId: crypto.randomUUID(),
      }));
      setQueue([...pendingRef.current, ...evs]);
      setNow(clock());
      void flush();
    },
    [clock, flush],
  );

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
  const myEvents = useMemo(() => (me ? [...me.events, ...pending] : []), [me, pending]);

  return { view, setView, now, emit, refresh, myEvents, me, pendingCount: pending.length, syncError, lastSync };
}
