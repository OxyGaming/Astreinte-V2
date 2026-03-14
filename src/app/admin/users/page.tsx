import { requireAdminSession } from "@/lib/admin-auth";
import { getAllUsers } from "@/lib/db";
import Link from "next/link";
import { Plus, User, Shield, Edit, Check, X } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Administrateur", color: "bg-red-100 text-red-700" },
  EDITOR: { label: "Éditeur", color: "bg-blue-100 text-blue-700" },
  USER: { label: "Utilisateur", color: "bg-slate-100 text-slate-600" },
};

export default async function AdminUsersPage() {
  await requireAdminSession();
  const users = await getAllUsers();

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} compte{users.length !== 1 ? "s" : ""} front-office</p>
        </div>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nouvel utilisateur
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <User size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Aucun utilisateur</p>
            <p className="text-sm mt-1">Créez le premier compte utilisateur.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Identifiant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actif</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const role = ROLE_LABELS[u.role] ?? { label: u.role, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-slate-500" />
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {u.prenom} {u.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{u.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${role.color}`}>
                        {u.role === "ADMIN" && <Shield size={10} />}
                        {role.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.actif ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                          <Check size={13} /> Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <X size={13} /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <Edit size={13} />
                        Modifier
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
