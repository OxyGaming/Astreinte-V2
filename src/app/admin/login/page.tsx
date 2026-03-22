import { redirect } from "next/navigation";

// L'authentification admin est unifiée avec le front-office.
// Cette page redirige vers /login en conservant le paramètre "from".
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const destination = from || "/admin";
  redirect(`/login?from=${encodeURIComponent(destination)}`);
}
