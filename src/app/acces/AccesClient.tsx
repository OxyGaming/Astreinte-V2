"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search, X, Crosshair, Navigation, ChevronRight,
  AlertCircle, ChevronLeft, Train, MapPin,
} from "lucide-react";
import type { AccesRail } from "@/lib/types";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, " ");
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesQuery(p: AccesRail, q: string): boolean {
  const nq = normalize(q);
  return (
    normalize(p.nomComplet).includes(nq) ||
    normalize(p.pk).includes(nq) ||
    (!!p.identifiant && normalize(p.identifiant).includes(nq)) ||
    (!!p.type && normalize(p.type).includes(nq)) ||
    (!!p.description && normalize(p.description).includes(nq))
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  points: AccesRail[];
  lignes: string[];
}

type NearestPoint = AccesRail & { distance: number };

// ─── Composant détail ─────────────────────────────────────────────────────────

function AccesDetail({ point, onClose }: { point: AccesRail; onClose: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-4 lg:px-8">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> Retour
        </button>
        <h1 className="text-xl font-bold text-slate-900">{point.nomAffiche}</h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{point.nomComplet}</p>
      </div>

      <div className="px-4 py-5 lg:px-8 space-y-4">
        {/* Bouton naviguer */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold py-4 rounded-xl transition-colors text-base tracking-wide"
        >
          <Navigation size={20} />
          NAVIGUER
        </a>

        {/* Fiche détail */}
        <div className="card divide-y divide-slate-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ligne</span>
            <span className="text-sm font-mono font-bold text-slate-800">{point.ligne}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">PK</span>
            <span className="text-sm font-mono font-bold text-slate-800">{point.pk}</span>
          </div>
          {point.type && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</span>
              <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {point.type}
              </span>
            </div>
          )}
          {point.identifiant && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Identifiant</span>
              <span className="text-sm font-semibold text-slate-800">{point.identifiant}</span>
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Coordonnées</span>
            <span className="text-xs font-mono text-slate-600">
              {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Source</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                point.source === "KML"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {point.source}
            </span>
          </div>
        </div>

        {point.description && (
          <div className="card px-4 py-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-slate-700">{point.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AccesClient({ points, lignes }: Props) {
  const [query, setQuery] = useState("");
  const [selectedLigne, setSelectedLigne] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<AccesRail | null>(null);
  const [nearestPoints, setNearestPoints] = useState<NearestPoint[] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Points filtrés par ligne
  const ligneFiltered = useMemo(() => {
    if (!selectedLigne) return points;
    return points.filter((p) => p.ligne === selectedLigne);
  }, [points, selectedLigne]);

  // Résultats de recherche (max 100 résultats affichés)
  const searchResults = useMemo(() => {
    if (!query.trim()) return ligneFiltered.slice(0, 50);
    return ligneFiltered.filter((p) => matchesQuery(p, query)).slice(0, 100);
  }, [ligneFiltered, query]);

  // Géolocalisation → points les plus proches
  const findNearest = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    setNearestPoints(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const pool = selectedLigne ? ligneFiltered : points;
        const withDist = pool
          .map((p) => ({ ...p, distance: haversine(latitude, longitude, p.latitude, p.longitude) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
        setNearestPoints(withDist);
        setGeoLoading(false);
      },
      () => {
        setGeoError("Position GPS refusée ou indisponible. Vérifiez les permissions de localisation.");
        setGeoLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [points, ligneFiltered, selectedLigne]);

  // Vue détail
  if (selectedPoint) {
    return <AccesDetail point={selectedPoint} onClose={() => setSelectedPoint(null)} />;
  }

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* ─── En-tête + filtres ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Points d&apos;accès</h1>
          <p className="text-xs text-slate-400 mt-0.5">{points.length.toLocaleString("fr-FR")} points · KML + terrain</p>
        </div>

        {/* Sélecteur de ligne */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedLigne(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !selectedLigne
                ? "bg-blue-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Train size={12} />
            Toutes lignes
          </button>
          {lignes.map((l) => (
            <button
              key={l}
              onClick={() => setSelectedLigne(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-colors ${
                selectedLigne === l
                  ? "bg-blue-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNearestPoints(null);
            }}
            placeholder="PK, PN, nom… ex: 389+364, PN 178, tunnel"
            className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Bouton accès le plus proche */}
        <button
          onClick={findNearest}
          disabled={geoLoading}
          className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50 transition-colors"
        >
          <Crosshair size={16} className={geoLoading ? "animate-pulse" : ""} />
          {geoLoading ? "Localisation en cours…" : "Trouver l'accès le plus proche"}
        </button>

        {geoError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            {geoError}
          </div>
        )}
      </div>

      {/* ─── Résultats "les plus proches" ──────────────────────────────────── */}
      {nearestPoints && (
        <div className="px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crosshair size={14} className="text-blue-600" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Accès les plus proches
              </h2>
            </div>
            <button
              onClick={() => setNearestPoints(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Fermer
            </button>
          </div>

          <div className="card divide-y divide-slate-100">
            {nearestPoints.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold text-slate-300 w-4 flex-shrink-0 text-right">
                  {i + 1}
                </span>
                <button
                  onClick={() => setSelectedPoint(p)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="font-semibold text-sm text-slate-800 truncate">{p.nomAffiche}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    PK {p.pk} · L.{p.ligne}
                    {p.type && <span className="ml-1 text-blue-600">{p.type}</span>}
                  </p>
                </button>
                <span className="text-xs font-semibold text-slate-500 flex-shrink-0">
                  {p.distance < 1
                    ? `${Math.round(p.distance * 1000)} m`
                    : `${p.distance.toFixed(1)} km`}
                </span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex-shrink-0 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Naviguer"
                >
                  <Navigation size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Résultats de recherche ─────────────────────────────────────────── */}
      {!nearestPoints && (
        <div className="px-4 py-4 lg:px-8">
          <p className="text-xs text-slate-400 mb-3">
            {query.trim()
              ? `${searchResults.length} résultat${searchResults.length > 1 ? "s" : ""}${searchResults.length === 100 ? " (100 max)" : ""}`
              : `${ligneFiltered.length.toLocaleString("fr-FR")} points — saisissez pour filtrer`}
          </p>

          {query.trim() && searchResults.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <MapPin size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Aucun point trouvé</p>
              <p className="text-xs mt-1">Essayez un PK, un PN, ou un nom de lieu</p>
            </div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPoint(p)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">{p.nomAffiche}</p>
                      {p.type && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono leading-none">
                          {p.type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      PK {p.pk} · L.{p.ligne}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
