'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Enregistre le Service Worker et affiche un toast discret quand une nouvelle
 * version est disponible, avec un bouton "Mettre à jour" (reload).
 */
export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Premier chargement : pas de controller existant → ne pas considérer
    // comme "mise à jour" le premier skipWaiting.
    let isFirstController = !navigator.serviceWorker.controller;

    // controllerchange se déclenche quand un nouveau SW prend le contrôle
    // (après skipWaiting). Sur le premier install, on ignore l'événement.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isFirstController) {
        isFirstController = false;
        return;
      }
      setUpdateAvailable(true);
    });

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.debug('[SW] Enregistrement échoué :', err);
      });
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-[5.5rem] lg:bottom-4 left-3 right-3 lg:left-auto lg:right-4 lg:w-80 z-[70]"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <RefreshCw size={17} className="text-blue-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            Nouvelle version disponible
          </p>
          <p className="text-xs text-slate-500 leading-tight mt-0.5">
            Rechargez pour mettre à jour l&apos;application
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:bg-blue-900 transition-colors whitespace-nowrap"
          >
            Mettre à jour
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Ignorer la mise à jour"
          >
            <X size={11} />
            <span>Ignorer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
