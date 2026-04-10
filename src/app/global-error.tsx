'use client';

/**
 * Error boundary de niveau racine (global-error.tsx).
 *
 * Intercepte les erreurs qui remontent jusqu'au root layout, notamment :
 * - Crash dans OfflineIndicator ou ServiceWorkerRegister
 * - Erreur critique pendant l'hydratation du layout racine
 *
 * Ce composant doit inclure <html> et <body> car il remplace le root layout.
 * On reste volontairement minimaliste (pas de Tailwind garanti à ce niveau).
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Astreinte] Erreur globale :', error);
  }, [error]);

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erreur — Astreinte</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 4px 24px rgba(0,0,0,.08);
            text-align: center;
          }
          .icon {
            width: 56px; height: 56px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 28px;
          }
          .icon-warn { background: #fef3c7; }
          .icon-err  { background: #fee2e2; }
          h1 { font-size: 1.15rem; font-weight: 700; color: #1e3a8a; margin-bottom: .5rem; }
          p  { font-size: .875rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
          .btn {
            display: block; width: 100%;
            background: #1e3a8a; color: white;
            border: none; border-radius: 8px;
            padding: .75rem 1.5rem;
            font-size: .9rem; font-weight: 600;
            cursor: pointer; margin-bottom: .75rem;
          }
          .btn:hover { background: #1e40af; }
          .link {
            display: block;
            font-size: .8rem; color: #94a3b8;
            cursor: pointer; text-decoration: underline;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className={`icon ${isOffline ? 'icon-warn' : 'icon-err'}`}>
            {isOffline ? '📶' : '⚠️'}
          </div>
          <h1>{isOffline ? 'Mode hors ligne' : 'Erreur inattendue'}</h1>
          <p>
            {isOffline
              ? "L'application a rencontré une erreur pendant le chargement hors ligne. Rechargez la page pour utiliser la version en cache."
              : "Une erreur critique s'est produite. Rechargez la page ou revenez à l'accueil."}
          </p>
          <button className="btn" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
          <span className="link" onClick={() => { window.location.href = '/'; }}>
            ← Retour à l&apos;accueil
          </span>
        </div>
      </body>
    </html>
  );
}
