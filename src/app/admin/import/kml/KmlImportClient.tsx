"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload, MapPinned, AlertTriangle, CheckCircle2,
  ChevronLeft, Info, X, Loader2, Eye
} from "lucide-react";

interface ParsedPoint {
  nomComplet: string;
  nomAffiche: string;
  latitude: number | null;
  longitude: number | null;
  type: string;
  identifiant: string;
  pk: string;
  ligne: string;
  description: string;
  selected: boolean;
  error?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ─── Parser du nom ferroviaire (format : "{ligne}-{voie} {pk} [{type} [{identifiant}]]") ─

function parseNomFerroviaire(rawNom: string) {
  const nom = rawNom.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  const parts = nom.split(/\s+/).filter(Boolean);
  let idx = 0;
  let ligne = "";
  let pk = "";
  let type = "";
  let identifiant = "";

  // Token 0 : "{ligne}-{voie}" ex: "750000-1"
  if (idx < parts.length && /^\d+-\d+$/.test(parts[idx])) {
    ligne = parts[idx].split("-")[0];
    idx++;
  }

  // Token 1 : PK ex: "389+364" ou "387"
  if (idx < parts.length && /^\d+(\+\d+)?$/.test(parts[idx])) {
    pk = parts[idx];
    idx++;
  }

  // Tokens restants : type (majuscules 1-6 lettres) + identifiant
  if (idx < parts.length) {
    const candidate = parts[idx];
    if (/^[A-Z]{1,6}$/.test(candidate)) {
      type = candidate;
      idx++;
      if (idx < parts.length) {
        identifiant = parts.slice(idx).join(" ");
      }
    } else {
      identifiant = parts.slice(idx).join(" ");
    }
  }

  // Données étendues en fallback si le nom ne suit pas le format standard
  return { ligne, pk, type, identifiant };
}

// ─── Parser KML côté client ────────────────────────────────────────────────

function parseKML(xmlString: string): ParsedPoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("Fichier XML invalide ou mal formé.");

  const placemarks = Array.from(doc.querySelectorAll("Placemark"));
  if (placemarks.length === 0) throw new Error("Aucun point (Placemark) trouvé dans ce fichier KML.");

  return placemarks.map((pm): ParsedPoint => {
    const name = pm.querySelector("name")?.textContent?.trim() || "";
    const desc = pm.querySelector("description")?.textContent?.trim() || "";

    // Coordonnées (format KML : lon,lat,alt)
    const coordText = pm.querySelector("coordinates")?.textContent?.trim() || "";
    const coordParts = coordText.split(",").map((s) => parseFloat(s.trim()));
    const longitude = coordParts[0] || null;
    const latitude = coordParts[1] || null;

    // Données étendues (SchemaData / SimpleData) — fallback si pas de format standard
    const extData: Record<string, string> = {};
    pm.querySelectorAll("SimpleData").forEach((sd) => {
      const key = sd.getAttribute("name") || "";
      extData[key.toUpperCase()] = sd.textContent?.trim() || "";
    });
    pm.querySelectorAll("Data").forEach((d) => {
      const key = d.getAttribute("name") || "";
      const val = d.querySelector("value")?.textContent?.trim() || "";
      extData[key.toUpperCase()] = val;
    });

    // Extraction depuis le nom (format standard ferroviaire)
    const parsed = parseNomFerroviaire(name);

    // Fallback sur ExtendedData si le nom ne contient pas l'info
    const ligne = parsed.ligne || extData["LIGNE"] || extData["NUM_LIGNE"] || extData["CODE_LIGNE"] || "";
    const pk = parsed.pk || extData["PK"] || extData["PK_LIGNE"] || extData["POINT_KILOMETRIQUE"] || "";
    const type = parsed.type || extData["TYPE"] || extData["CATEGORIE"] || "";
    const identifiant = parsed.identifiant || extData["IDENTIFIANT"] || extData["ID"] || "";

    // nomAffiche : type + identifiant, ou identifiant seul, ou PK, ou nom brut
    let nomAffiche: string;
    if (type && identifiant) nomAffiche = `${type} ${identifiant}`;
    else if (type) nomAffiche = type;
    else if (identifiant) nomAffiche = identifiant;
    else if (pk) nomAffiche = `PK ${pk}`;
    else nomAffiche = name;

    const hasCoords = latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude);
    const error = !hasCoords ? "Coordonnées manquantes ou invalides" : undefined;

    return {
      nomComplet: name,
      nomAffiche,
      latitude,
      longitude,
      type,
      identifiant,
      pk,
      ligne,
      description: desc,
      selected: !error,
      error,
    };
  });
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function KmlImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [points, setPoints] = useState<ParsedPoint[]>([]);
  const [globalLigne, setGlobalLigne] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");

  // Appliquer la ligne globale à tous les points sans ligne
  function applyGlobalLigne() {
    if (!globalLigne.trim()) return;
    setPoints((prev) =>
      prev.map((p) => ({ ...p, ligne: p.ligne || globalLigne.trim() }))
    );
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".kml")) {
      setParseError("Seuls les fichiers .kml sont acceptés.");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    setPoints([]);
    setResult(null);
    try {
      const text = await file.text();
      const parsed = parseKML(text);
      setPoints(parsed);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Erreur de lecture du fichier.");
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function togglePoint(idx: number) {
    setPoints((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
    );
  }

  function toggleAll(val: boolean) {
    setPoints((prev) => prev.map((p) => ({ ...p, selected: p.error ? false : val })));
  }

  function updateField(idx: number, field: keyof ParsedPoint, value: string) {
    setPoints((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  const selectedPoints = points.filter((p) => p.selected);
  const invalidSelected = selectedPoints.filter(
    (p) => !p.ligne.trim() || !p.latitude || !p.longitude
  );

  async function handleImport() {
    if (selectedPoints.length === 0) return;
    if (invalidSelected.length > 0) {
      alert(`${invalidSelected.length} point(s) sélectionné(s) n'ont pas de ligne renseignée. Renseignez la ligne ou désélectionnez-les.`);
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const payload = selectedPoints.map((p) => ({
        nomComplet: p.nomComplet,
        nomAffiche: p.nomAffiche,
        latitude: p.latitude,
        longitude: p.longitude,
        type: p.type || null,
        identifiant: p.identifiant || null,
        pk: p.pk || "",
        ligne: p.ligne,
        description: p.description || null,
      }));
      const res = await fetch("/api/admin/import/kml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'import.");
      setResult(data);
      setPoints([]);
      setFileName("");
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Erreur serveur.");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setPoints([]);
    setParseError(null);
    setResult(null);
    setFileName("");
    setGlobalLigne("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/import"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={16} />
          Import
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MapPinned size={20} className="text-blue-600" />
          Import de points d&apos;accès (KML)
        </h1>
      </div>

      {/* Aide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Qu&apos;est-ce qu&apos;un fichier KML ?</p>
          <p className="text-blue-700">
            Un fichier KML est un fichier de carte géographique (Google Earth, QGIS, etc.).
            Il contient des points avec leurs coordonnées GPS et leurs noms.
            Vous pouvez en exporter depuis votre logiciel SIG habituel.
          </p>
        </div>
      </div>

      {/* Résultat d'import */}
      {result && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 mb-1">Import terminé avec succès</p>
              <p className="text-sm text-green-700">
                <strong>{result.imported}</strong> point(s) importé(s).
                {result.skipped > 0 && <> <strong>{result.skipped}</strong> ignoré(s) (déjà existants).</>}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-600 space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>⚠ {e}</li>)}
                </ul>
              )}
              <button onClick={reset} className="mt-3 text-sm text-green-700 underline hover:no-underline">
                Importer un autre fichier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone de dépôt */}
      {points.length === 0 && !result && (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".kml"
            className="hidden"
            onChange={handleFileChange}
          />
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
              <p className="text-gray-600">Analyse du fichier en cours…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Déposez votre fichier KML ici</p>
                <p className="text-sm text-gray-400 mt-1">ou cliquez pour choisir un fichier (.kml)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {parseError && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Erreur de lecture</p>
            <p>{parseError}</p>
            <button onClick={reset} className="mt-1 underline hover:no-underline text-red-600 text-xs">
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Aperçu des points parsés */}
      {points.length > 0 && (
        <div className="space-y-4">
          {/* Barre de contrôle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-700">
                <strong>{points.length}</strong> point(s) détecté(s) dans{" "}
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{fileName}</span>
              </p>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={13} /> Recommencer
            </button>
          </div>

          {/* Ligne globale */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex-shrink-0">
              Ligne par défaut pour les points sans ligne détectée :
            </p>
            <div className="flex items-center gap-2 flex-1 min-w-48">
              <input
                type="text"
                value={globalLigne}
                onChange={(e) => setGlobalLigne(e.target.value)}
                placeholder="Ex: LYON-GRENOBLE"
                className="flex-1 border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
              <button
                onClick={applyGlobalLigne}
                className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Appliquer
              </button>
            </div>
          </div>

          {/* Sélection globale */}
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => toggleAll(true)} className="text-blue-600 hover:underline">
              Tout sélectionner
            </button>
            <button onClick={() => toggleAll(false)} className="text-gray-500 hover:underline">
              Tout désélectionner
            </button>
            <span className="text-gray-400 ml-auto">
              {selectedPoints.length} / {points.length} sélectionné(s)
            </span>
          </div>

          {/* Tableau d'aperçu */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-20">Type</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-32">Ligne *</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-32">PK</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-24">Lat</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-24">Lon</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-28">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {points.map((p, i) => (
                  <tr key={i} className={`${p.selected ? "" : "opacity-50"} hover:bg-gray-50/80 transition-colors`}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={p.selected}
                        disabled={!!p.error}
                        onChange={() => togglePoint(i)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={p.nomAffiche}
                        onChange={(e) => updateField(i, "nomAffiche", e.target.value)}
                        className="w-full border-0 bg-transparent text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={p.type}
                        onChange={(e) => updateField(i, "type", e.target.value)}
                        placeholder="PN"
                        className="w-full border-0 bg-transparent font-mono text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={p.ligne}
                        onChange={(e) => updateField(i, "ligne", e.target.value)}
                        placeholder="Obligatoire"
                        className={`w-full border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          p.selected && !p.ligne.trim() ? "border-red-300 bg-red-50" : "border-gray-200 bg-transparent"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={p.pk}
                        onChange={(e) => updateField(i, "pk", e.target.value)}
                        placeholder="—"
                        className="w-full border-0 bg-transparent font-mono text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                      {p.latitude?.toFixed(5) ?? <span className="text-red-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                      {p.longitude?.toFixed(5) ?? <span className="text-red-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.error ? (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle size={11} /> {p.error}
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 size={11} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bouton d'import */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleImport}
              disabled={importing || selectedPoints.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {importing ? (
                <><Loader2 size={15} className="animate-spin" /> Import en cours…</>
              ) : (
                <><Upload size={15} /> Importer {selectedPoints.length} point(s)</>
              )}
            </button>
            {invalidSelected.length > 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle size={14} />
                {invalidSelected.length} point(s) sans ligne — à renseigner avant import
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
