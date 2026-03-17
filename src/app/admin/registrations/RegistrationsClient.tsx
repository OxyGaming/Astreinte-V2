"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Check, X, Clock, UserCheck, UserX, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

type Tab = "pending" | "approved" | "rejected";

const ROLE_OPTIONS = [
  { value: "USER", label: "Utilisateur" },
  { value: "EDITOR", label: "Éditeur" },
  { value: "ADMIN", label: "Administrateur" },
];

interface Props {
  pending: User[];
  approved: User[];
  rejected: User[];
}

export default function RegistrationsClient({ pending: initialPending, approved: initialApproved, rejected: initialRejected }: Props) {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState(initialPending);
  const [approved, setApproved] = useState(initialApproved);
  const [rejected, setRejected] = useState(initialRejected);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({});

  const lists: Record<Tab, User[]> = { pending, approved, rejected };
  const current = lists[tab];

  async function approve(user: User) {
    setLoadingId(user.id);
    const role = roleOverride[user.id] ?? "USER";
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", role }),
    });
    if (res.ok) {
      const updated = { ...user, status: "approved" as const, actif: true, role: role as User["role"] };
      setPending((p) => p.filter((u) => u.id !== user.id));
      setRejected((r) => r.filter((u) => u.id !== user.id));
      setApproved((a) => [updated, ...a]);
    }
    setLoadingId(null);
  }

  async function reject(user: User) {
    setLoadingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      const updated = { ...user, status: "rejected" as const, actif: false };
      setPending((p) => p.filter((u) => u.id !== user.id));
      setApproved((a) => a.filter((u) => u.id !== user.id));
      setRejected((r) => [updated, ...r]);
    }
    setLoadingId(null);
  }

  async function remove(user: User) {
    if (!confirm(`Supprimer définitivement le compte de ${user.prenom} ${user.nom} ?`)) return;
    setLoadingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setPending((p) => p.filter((u) => u.id !== user.id));
      setApproved((a) => a.filter((u) => u.id !== user.id));
      setRejected((r) => r.filter((u) => u.id !== user.id));
    }
    setLoadingId(null);
  }

  function formatDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes d'inscription</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les demandes d'accès à l'application
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "pending"
              ? "bg-amber-500 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Clock size={14} />
          En attente
          {pending.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === "pending" ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "approved"
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <UserCheck size={14} />
          Approuvés
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === "approved" ? "bg-white/30 text-white" : "bg-gray-100 text-gray-600"}`}>
            {approved.length}
          </span>
        </button>
        <button
          onClick={() => setTab("rejected")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "rejected"
              ? "bg-red-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <UserX size={14} />
          Refusés
          {rejected.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === "rejected" ? "bg-white/30 text-white" : "bg-gray-100 text-gray-600"}`}>
              {rejected.length}
            </span>
          )}
        </button>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {current.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <p className="font-medium">Aucune demande {tab === "pending" ? "en attente" : tab === "approved" ? "approuvée" : "refusée"}</p>
          </div>
        )}

        {current.map((user) => {
          const isExpanded = expandedId === user.id;
          const isLoading = loadingId === user.id;

          return (
            <div key={user.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* En-tête de la carte */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 font-semibold text-slate-600 text-sm">
                    {user.prenom[0]}{user.nom[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{user.prenom} {user.nom}</p>
                    <p className="text-xs text-gray-500 font-mono">{user.username}</p>
                  </div>
                  {user.poste && (
                    <span className="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full truncate max-w-[150px]">
                      {user.poste}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Boutons d'action selon l'onglet */}
                  {tab === "pending" && (
                    <>
                      {/* Sélecteur de rôle */}
                      <select
                        value={roleOverride[user.id] ?? "USER"}
                        onChange={(e) => setRoleOverride((r) => ({ ...r, [user.id]: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => approve(user)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Check size={13} />
                        Approuver
                      </button>
                      <button
                        onClick={() => reject(user)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <X size={13} />
                        Refuser
                      </button>
                    </>
                  )}

                  {tab === "rejected" && (
                    <>
                      <button
                        onClick={() => approve(user)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Check size={13} />
                        Approuver
                      </button>
                      <button
                        onClick={() => remove(user)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}

                  {tab === "approved" && (
                    <button
                      onClick={() => reject(user)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <X size={13} />
                      Révoquer
                    </button>
                  )}

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Détails dépliés */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Identifiant</p>
                    <p className="font-mono text-gray-700">{user.username}</p>
                  </div>
                  {user.email && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">E-mail</p>
                      <p className="text-gray-700">{user.email}</p>
                    </div>
                  )}
                  {user.poste && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Poste / service</p>
                      <p className="text-gray-700">{user.poste}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Date de demande</p>
                    <p className="text-gray-700">{formatDate(user.createdAt)}</p>
                  </div>
                  {user.motif && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Motif</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{user.motif}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Rôle actuel</p>
                    <p className="text-gray-700">{user.role}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
