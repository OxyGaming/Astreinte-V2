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
  const email = formData.get("email");
  const password = formData.get("password");
  const from = (formData.get("from") as string) || "/";

  // Validation basique des entrées
  const input = validateLoginInput(email, password);
  if (!input) {
    return { error: "Adresse e-mail ou mot de passe incorrect." };
  }

  // Rate limiting basé sur l'IP source
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  // Deux compteurs en parallèle :
  //   - login:ip:<ip>      → empêche le bourrage depuis une IP (anti-bot)
  //   - login:email:<email> → empêche le bourrage sur un compte, réinitialisable
  //                            par un admin qui réinitialise le mot de passe
  const rateLimitIpKey = `login:ip:${ip}`;
  const rateLimitEmailKey = `login:email:${input.email}`;
  const ipCheck = checkRateLimit(rateLimitIpKey);
  const emailCheck = checkRateLimit(rateLimitEmailKey);

  if (!ipCheck.allowed || !emailCheck.allowed) {
    return {
      error:
        "Trop de tentatives de connexion. Veuillez patienter 15 minutes avant de réessayer.",
    };
  }

  const result = await verifyUserCredentials(input.email, input.password);
  if (result.error === "pending") {
    // Mot de passe correct mais compte pas encore validé : ne pas consommer de slot rate-limit
    resetRateLimit(rateLimitIpKey);
    resetRateLimit(rateLimitEmailKey);
    return { error: "Votre compte est en attente de validation par un administrateur." };
  }
  if (result.error === "rejected") {
    // Idem : ne pas pénaliser un compte refusé (mot de passe vérifié avant ce point)
    resetRateLimit(rateLimitIpKey);
    resetRateLimit(rateLimitEmailKey);
    return { error: "Votre demande d'inscription a été refusée. Contactez un administrateur." };
  }
  if (result.error !== null) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  // Connexion réussie → on réinitialise les deux compteurs
  resetRateLimit(rateLimitIpKey);
  resetRateLimit(rateLimitEmailKey);
  const user = result.user;

  const proto = headersList.get("x-forwarded-proto") || "";
  const isHttps = proto === "https" || proto.split(",")[0].trim() === "https";
  const cookieStore = await cookies();
  // On embarque le rôle dans le token pour permettre au middleware (Edge)
  // de vérifier l'accès admin sans requête DB.
  cookieStore.set(COOKIE_NAME, await createUserToken(user.id, user.role), {
    httpOnly: true,
    secure: isHttps,
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
