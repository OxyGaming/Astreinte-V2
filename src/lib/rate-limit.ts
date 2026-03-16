/**
 * Limiteur de débit en mémoire — adapté à un déploiement single-instance (NAS/serveur perso).
 * Les compteurs sont réinitialisés au redémarrage du processus.
 * Pour un déploiement multi-instance, remplacer par Redis ou une solution partagée.
 */

const MAX_ATTEMPTS = 5; // tentatives max par fenêtre
const WINDOW_MS = 15 * 60 * 1000; // fenêtre de 15 minutes

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Vérifie et incrémente le compteur pour la clé donnée (ex: `login:192.168.1.1`).
 * Retourne `allowed: true` si la tentative est permise, `false` sinon.
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - entry.firstAttempt);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    retryAfterMs: 0,
  };
}

/**
 * Réinitialise le compteur après un succès (ex: connexion réussie).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

// Nettoyage périodique pour éviter les fuites mémoire (toutes les 30 min)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.firstAttempt > WINDOW_MS) {
        store.delete(key);
      }
    }
  }, 30 * 60 * 1000);
}
