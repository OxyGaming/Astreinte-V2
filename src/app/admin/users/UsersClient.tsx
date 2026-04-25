"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Shield, Edit, Check, X, Clock, ChevronDown } from "lucide-react";
import type { User as UserType } from "@/lib/types";

const ROLES: { value: string; label: string; color: string }[] = [
  { value: "USER",   label: "Utilisateur",    color: "bg-slate-100 text-slate-600" },
  { value: "EDITOR", label: "Éditeur",         color: "bg-blue-100 text-blue-700" },
  { value: "ADMIN",  label: "Administrateur",  color: "bg-red-100 text-red-700" },
];

function roleStyle(role: string) {
  return ROLES.find((r) => r.value === role) ?? { label: role, color: "bg-gray-100 text-gray-600" };
}

export default function UsersClient({ initialUsers }: { initialUsers: UserType[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(null);

  async function changeRole(user: UserType, newRole: string) {
    if (newRole === user.role) { setOpenDropdown(null); return; }
    setSavingId(user.id);
    setOpenDropdown(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((us) => us.map((u) => u.id === user.id ? { ...u, role: newRole as UserType["role"] } : u));
      setFeedback({ id: user.id, ok: true });
    } else {
      setFeedback({ id: user.id, ok: false });
    }
    setSavingId(null);
    setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
      {users.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <User size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucun utilisateur</p>
          <p className="text-sm mt-1">Créez le premier compte utilisateur.</p>
        </div>
      ) : (
        <table style={{ minWidth: 680 }} className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Identifiant</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const rs = roleStyle(u.role);
              const isSaving = savingId === u.id;
              const isOpen = openDropdown === u.id;
              const fb = feedback?.id === u.id ? feedback : null;

              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  {/* Nom */}
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

                  {/* Identifiant */}
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{u.username}</td>

                  {/* Rôle — dropdown inline */}
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenDropdown(isOpen ? null : u.id)}
                        disabled={isSaving}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity ${rs.color} ${isSaving ? "opacity-50" : "hover:opacity-80"}`}
                      >
                        {u.role === "ADMIN" && <Shield size={10} />}
                        {isSaving ? "…" : rs.label}
                        <ChevronDown size={10} className="opacity-60" />
                      </button>

                      {/* Feedback flash */}
                      {fb && (
                        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${fb.ok ? "bg-green-500" : "bg-red-500"}`} />
                      )}

                      {/* Dropdown */}
                      {isOpen && (
                        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                          {ROLES.map((r) => (
                            <button
                              key={r.value}
                              onClick={() => changeRole(u, r.value)}
                              className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 flex items-center gap-2 transition-colors ${r.value === u.role ? "opacity-40 cursor-default" : ""}`}
                            >
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${r.color}`}>
                                {r.value === "ADMIN" && <Shield size={9} />}
                                {r.label}
                              </span>
                              {r.value === u.role && <Check size={11} className="ml-auto text-gray-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-6 py-4">
                    {u.status === "pending" ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Clock size={13} /> En attente
                      </span>
                    ) : u.status === "rejected" ? (
                      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <X size={13} /> Refusé
                      </span>
                    ) : u.actif ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                        <Check size={13} /> Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <X size={13} /> Inactif
                      </span>
                    )}
                  </td>

                  {/* Modifier */}
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

      {/* Fermer le dropdown en cliquant ailleurs */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}
