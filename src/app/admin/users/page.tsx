import { requireAdminSession } from "@/lib/admin-auth";
import { getAllUsers } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdminSession();
  const users = await getAllUsers();

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} compte{users.length !== 1 ? "s" : ""} front-office — cliquez sur le rôle pour le modifier
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nouvel utilisateur
        </Link>
      </div>

      <UsersClient initialUsers={users} />
    </div>
  );
}
