// Service Worker — Astreinte V2
// Stratégie :
//   - Assets statiques Next.js (_next/static/) → Cache-first (versionnés par hash)
//   - Navigation complète (HTML) → Network-first, fallback cache, puis /offline.html
//   - Routes API → Network-first, fallback cache JSON
//   - RSC payloads / autres fetch → réseau uniquement (pas de mise en cache pour éviter les conflits)
//   - Message PRECACHE_CRITICAL → précache toutes les pages critiques en arrière-plan

const CACHE_NAME = 'astreinte-v2';
const OFFLINE_URL = '/offline.html';

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
  // 1. Récupérer la liste des slugs dynamiques depuis l'API
  const slugsRes = await fetch('/api/offline/slugs');
  if (!slugsRes.ok) throw new Error(`Slugs API error: ${slugsRes.status}`);
  const { fiches, postes, secteurs } = await slugsRes.json();

  // 2. Construire la liste complète des URLs à précacher
  const urls = [
    '/',
    '/contacts',
    '/fiches',
    '/postes',
    '/secteurs',
    '/mnemoniques',
    ...fiches.map(s => `/fiches/${s}`),
    ...postes.map(s => `/postes/${s}`),
    ...secteurs.map(s => `/secteurs/${s}`),
  ];

  // 3. Précacher chaque URL séquentiellement (évite de saturer le réseau)
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

  // 4. Notifier toutes les pages clientes du résultat
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
