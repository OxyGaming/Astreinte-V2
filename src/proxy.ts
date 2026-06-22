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
  "/sw.js",
  "/offline.html",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques — passe directement
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = await isValidToken(token);

  // Routes /api/** → 401 si non connecté.
  // Exception : navigation top-level (clic sur <a target="_blank"> vers un PDF,
  // bookmark direct, etc.) → redirection vers /login pour offrir une UX correcte
  // au lieu d'afficher un JSON brut. Détection via Sec-Fetch-Dest: document.
  if (pathname.startsWith("/api/")) {
    if (isAuthenticated) return NextResponse.next();
    // Le SW intercepte /api/* et re-fetch les requêtes, ce qui peut perdre
    // sec-fetch-mode/dest. L'en-tête accept est préservé : une vraie navigation
    // top-level (clic sur lien) embarque "text/html" alors qu'un fetch() côté
    // client envoie "*/*" ou "application/json".
    const secFetchMode = request.headers.get("sec-fetch-mode");
    const secFetchDest = request.headers.get("sec-fetch-dest");
    const accept = request.headers.get("accept") || "";
    const isTopLevelNavigation =
      secFetchMode === "navigate" ||
      secFetchDest === "document" ||
      accept.includes("text/html");
    if (isTopLevelNavigation) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
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
