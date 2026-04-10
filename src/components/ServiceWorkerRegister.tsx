'use client';

import { useEffect } from 'react';

/**
 * Enregistre le Service Worker au montage.
 * Ce composant ne rend rien — il est monté une seule fois dans le layout racine.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Quand une nouvelle version du SW est détectée, l'activer immédiatement
        // (skipWaiting est déjà appelé dans le SW lui-même)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Le nouveau SW est actif — les nouvelles navigations utiliseront le cache mis à jour
              console.debug('[SW] Mise à jour activée');
            }
          });
        });
      })
      .catch((err) => {
        // En mode dev ou si le SW échoue à s'enregistrer, on ignore silencieusement
        console.debug('[SW] Enregistrement échoué :', err);
      });
  }, []);

  return null;
}
