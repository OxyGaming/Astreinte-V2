import { requireAdminSession } from "@/lib/admin-auth";
import { getUserById } from "@/lib/db";
import { notFound } from "next/navigation";
import UserForm from "../UserForm";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Modifier — {user.prenom} {user.nom}
      </h1>
      <UserForm user={user} />
    </div>
  );
}
