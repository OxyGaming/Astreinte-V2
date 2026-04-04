"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";

interface Props {
  user?: User;
}

const ROLES = [
  { value: "USER", label: "Utilisateur — consultation + fiches + journal" },
  { value: "EDITOR", label: "Éditeur — modification contenus opérationnels" },
  { value: "ADMIN", label: "Administrateur — accès complet" },
];

export default function UserForm({ user }: Props) {
  const router = useRouter();
  const isEdit = !!user;

  const [nom, setNom] = useState(user?.nom ?? "");
  const [prenom, setPrenom] = useState(user?.prenom ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user?.role ?? "USER");
  const [actif, setActif] = useState(user?.actif ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = { nom, prenom, username, email: email.trim() || null, role, actif };
    if (password) payload.password = password;
    if (!isEdit) {
      if (!password) { setError("Le mot de passe est requis."); setLoading(false); return; }
    }

    const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur serveur");
        return;
      }
      router.push("/admin/users");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      router.push("/admin/users");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jessie"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Achille"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail (identifiant de connexion)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={!isEdit}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="prenom.nom@example.fr"
        />
        {!isEdit && <p className="text-xs text-gray-400 mt-1">Requis — l&apos;utilisateur se connecte avec cet e-mail.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Identifiant interne</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoCapitalize="none"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="prenom.nom"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {isEdit ? "Nouveau mot de passe (laisser vide = inchangé)" : "Mot de passe"}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEdit}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isEdit ? "••••••••" : "Choisir un mot de passe"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {isEdit && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActif((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${actif ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${actif ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm text-gray-700">{actif ? "Compte actif" : "Compte inactif"}</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          {loading ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer l'utilisateur"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>

      {isEdit && (
        <div className="border-t border-gray-200 pt-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Supprimer cet utilisateur
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">Confirmer la suppression ?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium"
              >
                Supprimer
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
