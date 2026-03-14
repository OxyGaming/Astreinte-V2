import { requireAdminSession } from "@/lib/admin-auth";
import UserForm from "../UserForm";

export default async function NewUserPage() {
  await requireAdminSession();
  return (
    <div className="p-6 lg:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvel utilisateur</h1>
      <UserForm />
    </div>
  );
}
