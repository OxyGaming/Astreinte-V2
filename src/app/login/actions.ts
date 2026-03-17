"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyUserCredentials } from "@/lib/user-auth";
import { COOKIE_NAME, COOKIE_MAX_AGE, createUserToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { validateLoginInput } from "@/lib/validate";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const username = formData.get("username");
  const password = formData.get("password");
  const from = (formData.get("from") as string) || "/";

  // Validation basique des entrées
  const input = validateLoginInput(username, password);
  if (!input) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  // Rate limiting basé sur l'IP source
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const rateLimitKey = `login:${ip}`;
  const { allowed } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    return {
      error:
        "Trop de tentatives de connexion. Veuillez patienter 15 minutes avant de réessayer.",
    };
  }

  const result = await verifyUserCredentials(input.username, input.password);
  if (result.error === "pending") {
    return { error: "Votre compte est en attente de validation par un administrateur." };
  }
  if (result.error === "rejected") {
    return { error: "Votre demande d'inscription a été refusée. Contactez un administrateur." };
  }
  if (result.error !== null) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  // Connexion réussie → on réinitialise le compteur
  resetRateLimit(rateLimitKey);
  const user = result.user;

  const isProduction = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createUserToken(user.id), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  redirect(from);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}
