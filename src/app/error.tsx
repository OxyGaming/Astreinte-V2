'use client';

/**
 * Error boundary de niveau page (App Router).
 *
 * Intercepte les erreurs non gérées dans les pages, notamment :
 * - Échec de navigation RSC hors ligne (fetch network error)
 * - Erreur dans un composant client d'une page
 *
 * Ce composant détecte si l'utilisateur est hors ligne pour adapter le message.
 * Un bouton "Recharger" déclenche une navigation complète (hard nav) vers l'URL
 * courante — le Service Worker servira alors la page depuis le cache HTML.
 */

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Ne pas loguer les erreurs réseau offline (bruit inutile)
    if (navigator.onLine) {
      console.error('[Astreinte] Erreur page :', error);
    }

    setIsOffline(!navigator.onLine);

    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [error]);

  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <WifiOff size={28} className="text-amber-600" />
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-800 mb-1">Page non disponible hors ligne</h1>
          <p className="text-sm text-slate-500 max-w-xs">
            Cette page n&apos;a pas pu être chargée sans réseau.
            Rechargez pour utiliser la version mise en cache.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          {/* Rechargement forcé → SW sert le HTML depuis le cache */}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            <RefreshCw size={15} />
            Recharger depuis le cache
          </button>

          {/* Retour à l'accueil (toujours en cache) */}
          <button
            onClick={() => { window.location.href = '/'; }}
            className="text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors"
          >
            ← Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Mode connecté : erreur applicative classique
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle size={28} className="text-red-600" />
      </div>

      <div>
        <h1 className="text-lg font-bold text-slate-800 mb-1">Une erreur est survenue</h1>
        <p className="text-sm text-slate-500 max-w-xs">
          Une erreur inattendue s&apos;est produite. Réessayez ou revenez à l&apos;accueil.
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
        >
          <RefreshCw size={15} />
          Réessayer
        </button>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors"
        >
          ← Retour à l&apos;accueil
        </button>
      </div>
    </div>
  );
}
