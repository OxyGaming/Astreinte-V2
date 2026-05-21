// Service Worker — Astreinte V2
// Stratégie :
//   - Assets statiques Next.js (_next/static/) → Cache-first (versionnés par hash)
//   - Navigation complète (HTML) → Network-first, fallback cache, puis /offline.html
//   - Routes API → Network-first, fallback cache JSON
//   - RSC payloads / autres fetch → réseau uniquement (pas de mise en cache pour éviter les conflits)
//   - Message PRECACHE_CRITICAL → précache toutes les pages critiques en arrière-plan

const CACHE_NAME = 'astreinte-v3';
const OFFLINE_URL = '/offline.html';
// Coquille canonique des pages de session de procédure : servie hors ligne pour
// toute URL /procedures/session/* (la sortie SSR est identique quel que soit l'id).
const PROC_SHELL_URL = '/procedures/session/__shell__';

// ─── Installation ─────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activation — nettoyage des anciens caches ────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Messages depuis les pages (précache à la demande) ────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRECACHE_CRITICAL') {
    // Ne pas bloquer le message handler — lancer en arrière-plan
    precacheCriticalPages().catch(() => {
      broadcastToClients({ type: 'PRECACHE_ERROR' });
    });
  }
});

// ─── Interception des requêtes ────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les requêtes cross-origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Assets statiques Next.js (versionnés par hash) → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages de session de procédure → coquille canonique en fallback hors ligne
  if (request.mode === 'navigate' && url.pathname.startsWith('/procedures/session/')) {
    event.respondWith(networkFirstProcedureSession(request));
    return;
  }

  // Navigation complète HTML → network-first, fallback cache + page offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Ressources publiques statiques (manifest, icônes) → cache-first
  if (
    url.pathname === '/manifest.json' ||
    url.pathname.match(/\.(png|ico|svg|webp)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Routes API → network-first, fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Tout le reste (RSC payloads Next.js, chunks dynamiques, etc.)
  // → réseau uniquement, pas de mise en cache pour éviter les conflits HTML/RSC
});

// ─── Stratégies de cache ──────────────────────────────────────────────────────

/** Cache-first : sert depuis le cache, réseau uniquement si absent */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

/** Network-first pour les pages HTML : met en cache au succès, page offline en fallback */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response(
      '<!DOCTYPE html><html lang="fr"><body><h1>Hors ligne</h1><p>Cette page n\'est pas disponible sans réseau.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Pages /procedures/session/* — network-first avec coquille canonique en fallback.
 *
 * La sortie SSR de ces pages est identique quel que soit l'id (l'id est lu côté
 * client). On peut donc servir une coquille unique en cache pour n'importe quelle
 * URL de session hors ligne — y compris une session démarrée hors ligne dont
 * l'id n'a jamais existé côté serveur.
 */
async function networkFirstProcedureSession(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await putInCache(request, response.clone());
      // Garder la coquille canonique à jour à chaque session réellement ouverte.
      await putInCache(PROC_SHELL_URL, response.clone());
    }
    return response;
  } catch {
    // 1. Correspondance exacte (cette session précise a déjà été ouverte/précachée)
    const exact = await caches.match(request);
    if (exact) return exact;
    // 2. Coquille canonique (sert n'importe quelle session hors ligne)
    const shell = await caches.match(PROC_SHELL_URL);
    if (shell) return shell;
    // 3. Dernier recours
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response(
      '<!DOCTYPE html><html lang="fr"><body><h1>Hors ligne</h1><p>Cette page n\'est pas disponible sans réseau.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/** Network-first pour les API : fallback vers le cache, puis JSON d'erreur */
async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: 'offline', message: 'Données non disponibles hors ligne' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/** Mise en cache silencieuse (ignore les erreurs de quota) */
async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch {
    // Quota dépassé ou autre erreur de cache → ignorer
  }
}

// ─── Précache intelligent ─────────────────────────────────────────────────────

/**
 * Précache toutes les pages critiques de l'application.
 * Appelé via message depuis le client après login / au retour en ligne.
 *
 * Note : les fetch() émis ici par le SW NE sont PAS interceptés par son propre
 * handler fetch (spec SW) — ils vont directement au réseau avec les cookies de session.
 */
async function precacheCriticalPages() {
  // 1. Inventaire des pages dynamiques depuis l'API
  const slugsRes = await fetch('/api/offline/slugs');
  if (!slugsRes.ok) throw new Error(`Slugs API error: ${slugsRes.status}`);
  const data = await slugsRes.json();
  const fiches              = data.fiches              || [];
  const postes              = data.postes              || [];
  const secteurs            = data.secteurs            || [];
  const contacts            = data.contacts            || [];
  const sessions            = data.sessions            || [];
  const mainCourantes       = data.mainCourantes       || [];
  const procedureSessions   = data.procedureSessions   || [];
  const posteProcedureTypes = data.posteProcedureTypes || {};
  const documents           = data.documents           || [];

  // 2. Pages (navigations HTML).
  // Note : les pages user-spécifiques (/sessions, /main-courante…) reflètent
  // l'utilisateur courant — un changement d'utilisateur verrait l'ancien cache
  // jusqu'au prochain retour réseau.
  const pages = [
    '/',
    '/contacts',
    '/fiches',
    '/postes',
    '/secteurs',
    '/mnemoniques',
    '/sessions',
    '/main-courante',
    '/main-courante/mes-soumissions',
    '/acces',
    '/liens-utiles',
    '/recherche',
    '/mode-operatoire.html',
    PROC_SHELL_URL,
    ...fiches.map(s => `/fiches/${s}`),
    ...postes.map(s => `/postes/${s}`),
    ...secteurs.map(s => `/secteurs/${s}`),
    ...contacts.map(id => `/contacts/${id}`),
    ...sessions.map(id => `/sessions/${id}`),
    ...mainCourantes.map(id => `/main-courante/${id}`),
  ];
  for (const slug of postes) {
    pages.push(`/postes/${slug}/procedures`);
    pages.push(`/postes/${slug}/cessation`);
    for (const type of (posteProcedureTypes[slug] || [])) {
      pages.push(`/postes/${slug}/procedures/${type}`);
    }
  }

  // 3. Endpoints API consommés côté client (réponses JSON cachées).
  const apis = [];
  for (const slug of postes) {
    apis.push(`/api/postes/${slug}/procedures`);
    for (const type of (posteProcedureTypes[slug] || [])) {
      apis.push(`/api/postes/${slug}/procedures?type=${type}`);
    }
  }
  for (const id of procedureSessions) {
    apis.push(`/api/procedures/sessions/${id}`);
  }

  // 4. Documents PDF de référence.
  const docs = documents.map(id => `/api/documents/${id}/download`);

  // 5. Précache séquentiel (évite de saturer le réseau ; les PDF peuvent être lourds).
  const urls = [...pages, ...apis, ...docs];
  const cache = await caches.open(CACHE_NAME);
  let cached = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (response.ok) {
        await cache.put(url, response);
        cached++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // 6. Notifier toutes les pages clientes du résultat
  broadcastToClients({
    type: 'PRECACHE_DONE',
    timestamp: Date.now(),
    total: urls.length,
    cached,
    failed,
  });
}

/** Envoie un message à toutes les pages clientes ouvertes */
async function broadcastToClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage(message);
  }
}
