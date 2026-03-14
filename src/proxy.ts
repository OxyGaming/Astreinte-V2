import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth-edge";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-auth-edge";

const PUBLIC_PREFIXES = [
  "/login",
  "/admin/login",
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

  // Routes /admin/** → auth admin
  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!isValidAdminToken(adminToken)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Routes /api/admin/** → auth admin (pour les fetch depuis le navigateur)
  if (pathname.startsWith("/api/admin")) {
    const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!isValidAdminToken(adminToken)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.next();
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
