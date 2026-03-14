"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PointData {
  id: string;
  ligne: string;
  pk: string;
  type: string | null;
  identifiant: string | null;
  nomAffiche: string;
  nomComplet: string;
  latitude: number;
  longitude: number;
  description: string | null;
  source: string;
}

interface Props {
  mode: "create" | "edit";
  point?: PointData;
}

export default function AccesForm({ mode, point }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    ligne: point?.ligne ?? "",
    pk: point?.pk ?? "",
    type: point?.type ?? "",
    identifiant: point?.identifiant ?? "",
    nomAffiche: point?.nomAffiche ?? "",
    nomComplet: point?.nomComplet ?? "",
    latitude: point?.latitude?.toString() ?? "",
    longitude: point?.longitude?.toString() ?? "",
    description: point?.description ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setError("Latitude et longitude doivent être des nombres valides.");
      setLoading(false);
      return;
    }

    const url = mode === "create" ? "/api/admin/acces" : `/api/admin/acces/${point!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ligne: form.ligne,
        pk: form.pk,
        nomAffiche: form.nomAffiche,
        nomComplet: form.nomComplet,
        latitude: lat,
        longitude: lon,
        type: form.type || null,
        identifiant: form.identifiant || null,
        description: form.description || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de l'enregistrement");
      setLoading(false);
      return;
    }

    router.push("/admin/acces");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce point d'accès ? Cette action est irréversible.")) return;
    const res = await fetch(`/api/admin/acces/${point!.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/acces");
      router.refresh();
    }
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl space-y-5">
      {/* Ligne + PK */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Ligne *</label>
          <input name="ligne" value={form.ligne} onChange={handleChange} required placeholder="ex: 750000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>PK *</label>
          <input name="pk" value={form.pk} onChange={handleChange} required placeholder="ex: 389+364" className={inputCls} />
        </div>
      </div>

      {/* Type + Identifiant */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Type</label>
          <input name="type" value={form.type} onChange={handleChange} placeholder="ex: PN, TUN, PRO…" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Identifiant</label>
          <input name="identifiant" value={form.identifiant} onChange={handleChange} placeholder="ex: 178-2" className={inputCls} />
        </div>
      </div>

      {/* Noms */}
      <div>
        <label className={labelCls}>Nom affiché *</label>
        <input name="nomAffiche" value={form.nomAffiche} onChange={handleChange} required placeholder="ex: PN 178-2" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Nom complet (brut) *</label>
        <input name="nomComplet" value={form.nomComplet} onChange={handleChange} required placeholder="ex: 750000-1 389+364 PN 178-2" className={inputCls} />
      </div>

      {/* Coordonnées */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Latitude *</label>
          <input
            name="latitude" type="number" step="any"
            value={form.latitude} onChange={handleChange} required
            placeholder="ex: 46.21331" className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Longitude *</label>
          <input
            name="longitude" type="number" step="any"
            value={form.longitude} onChange={handleChange} required
            placeholder="ex: 3.81467" className={inputCls}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          name="description" value={form.description} onChange={handleChange}
          rows={3} placeholder="Notes, restrictions d'accès, difficultés…"
          className={inputCls}
        />
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? "Enregistrement…" : mode === "create" ? "Créer le point" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm transition-colors"
        >
          Annuler
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto text-red-600 hover:text-red-800 text-sm px-4 py-2.5 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>

      {mode === "edit" && point && (
        <p className="text-xs text-gray-400">
          Source : <span className={point.source === "KML" ? "text-gray-500" : "text-green-600 font-medium"}>{point.source}</span>
        </p>
      )}
    </form>
  );
}
