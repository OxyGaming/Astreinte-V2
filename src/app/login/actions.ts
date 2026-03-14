"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyUserCredentials } from "@/lib/user-auth";
import { COOKIE_NAME, COOKIE_MAX_AGE, createUserToken } from "@/lib/auth";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const from = (formData.get("from") as string) || "/";

  const user = await verifyUserCredentials(username, password);
  if (!user) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createUserToken(user.id), {
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
