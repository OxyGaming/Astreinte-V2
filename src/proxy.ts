import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth-edge";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-auth-edge";

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/api/register",
  "/admin/login",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/icons",
];

/**
 * Vérifie si la requête dispose d'une session authentifiée pour accéder aux routes admin.
 *
 * Deux mécanismes acceptés :
 *   1. Cookie "astreinte-admin" valide (compte AdminUser dédié — accès direct)
 *   2. Cookie "astreinte-auth" valide (utilisateur front-office connecté)
 *      → Le contrôle du rôle ADMIN est délégué à requireAdminSession() côté serveur,
 *        qui effectue une vérification en base de données.
 *
 * Ce design sépare authentification (middleware) et autorisation (server component).
 */
function hasAdminAccess(request: NextRequest): boolean {
  // Priorité 1 : cookie admin classique (AdminUser)
  const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
  if (isValidAdminToken(adminToken)) return true;

  // Priorité 2 : session front-office active (rôle vérifié en DB par requireAdminSession)
  const userToken = request.cookies.get(COOKIE_NAME)?.value;
  if (isValidToken(userToken)) return true;

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques — passe directement
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Routes /admin/** → doit avoir une session (admin ou front-office)
  // La vérification du rôle ADMIN est faite dans requireAdminSession() (serveur)
  if (pathname.startsWith("/admin")) {
    if (hasAdminAccess(request)) return NextResponse.next();
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Routes /api/admin/** → idem (fetch navigateur depuis les pages admin)
  if (pathname.startsWith("/api/admin")) {
    if (hasAdminAccess(request)) return NextResponse.next();
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Toutes les autres routes → auth utilisateur normale
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!isValidToken(token)) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
