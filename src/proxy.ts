import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth-edge";

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/api/register",
  "/admin/login", // Redirige vers /login — conservé pour les anciens favoris
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/icons",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques — passe directement
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = isValidToken(token);

  // Routes /api/admin/** → 401 si non connecté
  if (pathname.startsWith("/api/admin")) {
    if (isAuthenticated) return NextResponse.next();
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Routes /admin/** → redirection vers /login si non connecté
  // La vérification du rôle ADMIN est faite par requireAdminSession() côté serveur
  if (pathname.startsWith("/admin")) {
    if (isAuthenticated) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Toutes les autres routes → auth utilisateur normale
  if (!isAuthenticated) {
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
