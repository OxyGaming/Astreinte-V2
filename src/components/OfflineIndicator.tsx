'use client';

/**
 * OfflineIndicator — gestion unifiée de l'état réseau + synchronisation hors ligne.
 *
 * Responsabilités :
 * - Détecter les changements online/offline
 * - Déclencher le précache des pages critiques (auto + manuel)
 * - Afficher l'état courant de manière claire et non intrusive
 *
 * États affichés :
 *  ONLINE + syncing       → bandeau bleu "Chargement des données hors ligne…"
 *  ONLINE + sync done     → bandeau bleu bref "N pages disponibles hors ligne"
 *  ONLINE + stale cache   → bandeau discret "Mise à jour disponible · [Mettre à jour]"
 *  ONLINE + fresh         → null (rien affiché)
 *  OFFLINE + cache frais  → bandeau amber "Hors ligne · données du [date] · À jour"
 *  OFFLINE + cache vieux  → bandeau amber "Hors ligne · données du [date] · Potentiellement obsolètes"
 *  OFFLINE + pas de cache → bandeau amber "Hors ligne · certaines pages indisponibles"
 *  Just reconnected       → bandeau vert 3s "Connexion rétablie…"
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LS_LAST_ONLINE = 'astreinte:lastOnline';
const LS_PRECACHE    = 'astreinte:precache'; // { timestamp, cached, failed }
const SS_FRESH_LOGIN = 'astreinte:freshLogin'; // posé par le formulaire de login

/** Au-delà de 6h, les données sont considérées "potentiellement obsolètes" */
const STALE_MS = 6 * 60 * 60 * 1000;

/** Délai initial avant le premier précache (évite de bloquer le rendu) */
const PRECACHE_INITIAL_DELAY_MS = 4_000;

/** Délai très court juste après login : on déclenche dès que possible */
const PRECACHE_FRESH_LOGIN_DELAY_MS = 400;

/** Délai avant précache automatique au retour en ligne */
const PRECACHE_RECONNECT_DELAY_MS = 2_000;

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

interface PrecacheInfo {
  timestamp: number;
  cached: number;
  failed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readLS<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch { return null; }
}

function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* navigation privée */ }
}

function isStale(timestamp: number | null | undefined): boolean {
  if (!timestamp) return true;
  return Date.now() - timestamp > STALE_MS;
}

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now  = new Date();
  const diffMin = Math.floor((now.getTime() - ts) / 60_000);

  if (diffMin < 1)  return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24 && date.getDate() === now.getDate()) {
    return `aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function OfflineIndicator() {
  const pathname = usePathname();
  const [isOffline,       setIsOffline]       = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [syncState,       setSyncState]       = useState<SyncState>('idle');
  const [precache,        setPrecache]        = useState<PrecacheInfo | null>(null);

  // Ref pour éviter les appels multiples simultanés
  const syncingRef = useRef(false);

  // ─── Déclencher le précache via SW ────────────────────────────────────────

  const triggerPrecache = useCallback(() => {
    if (syncingRef.current) return;
    if (!navigator.onLine) return;
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;

    syncingRef.current = true;
    setSyncState('syncing');
    sw.postMessage({ type: 'PRECACHE_CRITICAL' });
  }, []);

  // ─── Effets ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Lire l'état persisté
    const savedPrecache = readLS<PrecacheInfo>(LS_PRECACHE);
    if (savedPrecache) setPrecache(savedPrecache);

    // ── Gestion online/offline ──
    function markOnline() {
      const now = Date.now();
      writeLS(LS_LAST_ONLINE, now);
    }

    function handleOnline() {
      markOnline();
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 3_000);

      // Rafraîchir automatiquement le cache si obsolète
      const info = readLS<PrecacheInfo>(LS_PRECACHE);
      if (isStale(info?.timestamp)) {
        setTimeout(triggerPrecache, PRECACHE_RECONNECT_DELAY_MS);
      }

      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOffline(true);
      setJustReconnected(false);
      syncingRef.current = false;
    }

    // ── Gestion des messages SW ──
    function handleSwMessage(event: MessageEvent) {
      const { data } = event;

      if (data?.type === 'PRECACHE_DONE') {
        const info: PrecacheInfo = {
          timestamp: data.timestamp,
          cached:    data.cached,
          failed:    data.failed,
        };
        writeLS(LS_PRECACHE, info);
        setPrecache(info);
        setSyncState('done');
        syncingRef.current = false;
        // Repasser en idle après 5s
        setTimeout(() => setSyncState(s => s === 'done' ? 'idle' : s), 5_000);
      }

      if (data?.type === 'PRECACHE_ERROR') {
        setSyncState('error');
        syncingRef.current = false;
        setTimeout(() => setSyncState(s => s === 'error' ? 'idle' : s), 5_000);
      }
    }

    // ── Initialisation ──
    if (!navigator.onLine) {
      handleOffline();
    } else {
      markOnline();
      // Premier précache différé si les données sont absentes ou obsolètes
      // (le cas "fresh login" est traité par l'effet pathname plus bas)
      const info = readLS<PrecacheInfo>(LS_PRECACHE);
      if (isStale(info?.timestamp)) {
        setTimeout(triggerPrecache, PRECACHE_INITIAL_DELAY_MS);
      }
    }

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [triggerPrecache]);

  // ─── Détection "fresh login" sur changement de route ─────────────────────
  // Le redirect du server action est une soft-navigation : le composant ne
  // remonte pas, mais usePathname() change → on re-vérifie le flag posé par
  // le formulaire de login avant la soumission.
  useEffect(() => {
    if (!navigator.onLine) return;
    let freshLogin = false;
    try {
      if (sessionStorage.getItem(SS_FRESH_LOGIN) === '1') {
        freshLogin = true;
        sessionStorage.removeItem(SS_FRESH_LOGIN);
      }
    } catch { /* navigation privée */ }
    if (freshLogin) {
      setTimeout(triggerPrecache, PRECACHE_FRESH_LOGIN_DELAY_MS);
    }
  }, [pathname, triggerPrecache]);

  // ─── Rendu ────────────────────────────────────────────────────────────────

  // 1. Juste reconnecté
  if (justReconnected) {
    return (
      <div role="status" aria-live="polite"
           className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium">
        <Wifi size={14} aria-hidden />
        Connexion rétablie — mise à jour des données en cours…
      </div>
    );
  }

  // 2. Mode hors ligne
  if (isOffline) {
    const fresh = !isStale(precache?.timestamp);
    return (
      <div role="status" aria-live="assertive"
           className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium">
        <WifiOff size={14} aria-hidden />
        <span>Mode hors ligne</span>

        {precache ? (
          <>
            <span className="opacity-80 text-xs">
              — données du {formatDate(precache.timestamp)}
            </span>
            {fresh ? (
              <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                <CheckCircle size={11} aria-hidden />
                À jour
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                <AlertTriangle size={11} aria-hidden />
                Potentiellement obsolètes
              </span>
            )}
          </>
        ) : (
          <span className="opacity-80 text-xs">
            — certaines pages peuvent être indisponibles
          </span>
        )}
      </div>
    );
  }

  // 3. Synchronisation en cours
  if (syncState === 'syncing') {
    return (
      <div role="status" aria-live="polite"
           className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-xs">
        <RefreshCw size={12} className="animate-spin" aria-hidden />
        Chargement des données hors ligne…
      </div>
    );
  }

  // 4. Synchronisation terminée (feedback bref)
  if (syncState === 'done' && precache) {
    return (
      <div role="status" aria-live="polite"
           className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-xs">
        <CheckCircle size={12} aria-hidden />
        {precache.cached} pages disponibles hors ligne
        {precache.failed > 0 && (
          <span className="opacity-70">({precache.failed} échec{precache.failed > 1 ? 's' : ''})</span>
        )}
      </div>
    );
  }

  // 5. Cache obsolète (mise à jour disponible, mode connecté)
  if (syncState === 'idle' && isStale(precache?.timestamp)) {
    return (
      <div role="status"
           className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200 text-slate-500 text-xs">
        <AlertTriangle size={12} className="text-amber-500" aria-hidden />
        <span>
          Données hors ligne&nbsp;
          {precache
            ? <>du {formatDate(precache.timestamp)} — potentiellement obsolètes</>
            : <>non disponibles</>
          }
        </span>
        <button
          onClick={triggerPrecache}
          className="ml-auto flex items-center gap-1 text-blue-600 font-medium hover:underline focus:outline-none focus:underline"
          aria-label="Mettre à jour les données hors ligne"
        >
          <RefreshCw size={12} aria-hidden />
          Mettre à jour
        </button>
      </div>
    );
  }

  // 6. Mode connecté, cache frais → rien à afficher
  return null;
}
