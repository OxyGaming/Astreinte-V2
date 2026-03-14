"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminCredentials, createAdminToken, ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE } from "@/lib/admin-auth";

export async function adminLoginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Identifiants requis" };
  }

  const user = await verifyAdminCredentials(username, password);
  if (!user) {
    return { error: "Identifiants incorrects" };
  }

  const token = createAdminToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
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
