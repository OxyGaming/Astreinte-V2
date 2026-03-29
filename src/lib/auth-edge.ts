// Utilisé par le middleware (Edge Runtime) — pas de modules Node.js
// Tokens signés HMAC-SHA256 avec expiration — Web Crypto API uniquement

export const COOKIE_NAME = "astreinte-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

const getSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[SÉCURITÉ] SESSION_SECRET est obligatoire en production. Définissez cette variable d'environnement."
      );
    }
    return "astreinte-dev-insecure-do-not-use-in-prod";
  }
  return secret;
};

// ─── Helpers base64url ─────────────────────────────────────────────────────────

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

async function signHmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function verifyHmac(payload: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const base64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const sigBytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

// ─── API publique ──────────────────────────────────────────────────────────────

/**
 * Crée un token signé HMAC-SHA256 avec expiration.
 * Format : base64url(userId:role:exp).hmac_base64url
 */
export async function createUserToken(userId: string, role: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = toBase64Url(`${userId}:${role}:${exp}`);
  const sig = await signHmac(payload);
  return `${payload}.${sig}`;
}

/** Vérifie la signature HMAC et l'expiration du token (sans accès DB). */
export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex < 0) return false;
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    if (!(await verifyHmac(payload, sig))) return false;
    const decoded = fromBase64Url(payload);
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const exp = parseInt(parts[2], 10);
    return !isNaN(exp) && Date.now() / 1000 < exp;
  } catch {
    return false;
  }
}

/**
 * Extrait l'userId depuis un token.
 * Appeler uniquement après isValidToken — ne re-vérifie pas la signature.
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = token.slice(0, token.lastIndexOf("."));
    return fromBase64Url(payload).split(":")[0] || null;
  } catch {
    return null;
  }
}

/**
 * Extrait le rôle depuis un token.
 * Appeler uniquement après isValidToken — ne re-vérifie pas la signature.
 */
export function getRoleFromToken(token: string): string | null {
  try {
    const payload = token.slice(0, token.lastIndexOf("."));
    return fromBase64Url(payload).split(":")[1] || null;
  } catch {
    return null;
  }
}

/** Vérifie si un token appartient à un ADMIN — pour le middleware Edge. */
export async function isAdminUserToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return (await isValidToken(token)) && getRoleFromToken(token) === "ADMIN";
}
