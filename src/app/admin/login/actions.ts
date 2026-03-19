"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyAdminCredentials,
  createAdminToken,
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
} from "@/lib/admin-auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { validateLoginInput } from "@/lib/validate";

export async function adminLoginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const username = formData.get("username");
  const password = formData.get("password");

  // Validation basique des entrées
  const input = validateLoginInput(username, password);
  if (!input) {
    return { error: "Identifiants requis" };
  }

  // Rate limiting basé sur l'IP source
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const rateLimitKey = `admin-login:${ip}`;
  const { allowed } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    return {
      error:
        "Trop de tentatives. Veuillez patienter 15 minutes avant de réessayer.",
    };
  }

  const user = await verifyAdminCredentials(input.username, input.password);
  if (!user) {
    return { error: "Identifiants incorrects" };
  }

  // Connexion réussie → on réinitialise le compteur
  resetRateLimit(rateLimitKey);

  const proto = headersList.get("x-forwarded-proto") || "";
  const isHttps = proto === "https" || proto.split(",")[0].trim() === "https";
  const token = createAdminToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "strict",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
