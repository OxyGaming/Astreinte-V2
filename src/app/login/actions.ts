"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkCredentials,
  generateToken,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "@/lib/auth";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const from = (formData.get("from") as string) || "/";

  if (!checkCredentials(username, password)) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, generateToken(), {
    httpOnly: true,
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
