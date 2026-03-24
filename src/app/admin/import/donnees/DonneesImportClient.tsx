"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft, Download, Upload, Loader2, CheckCircle2, AlertTriangle,
  X, Info, FileX, Phone, BookOpen, Hash, MapPin, Building2, ClipboardList,
} from "lucide-react";

// ─── Types de données ───────────────────────────────────────────────────────

interface ContactRow { nom: string; role: string; categorie: string; telephone: string; telephoneAlt?: string; note?: string; disponibilite?: string; errors: string[]; warnings: string[] }
interface MnemoniqueRow { acronyme: string; titre: string; description: string; contexte?: string; couleur?: string; lettres: { lettre: string; signification: string; detail?: string }[]; errors: string[]; warnings: string[] }
interface AbreviationRow { sigle: string; definition: string; errors: string[]; warnings: string[] }
interface AccesRow { ligne: string; pk: string; type?: string; identifiant?: string; nomAffiche: string; nomComplet: string; latitude: number; longitude: number; description?: string; errors: string[]; warnings: string[] }
interface PosteRow { slug: string; nom: string; typePoste: string; lignes: string[]; adresse: string; horaires: string; electrification: string; systemeBlock: string; secteur_slug?: string; particularites: string[]; errors: string[]; warnings: string[] }
interface ProcedureRow { slug: string; titre: string; typeProcedure: string; description?: string; version: string; etapes_json: string; postes_slugs?: string; errors: string[]; warnings: string[] }

interface ParsedData {
  contacts: ContactRow[];
  mnemoniques: MnemoniqueRow[];
  abreviations: AbreviationRow[];
  acces: AccesRow[];
  postes: PosteRow[];
  procedures: ProcedureRow[];
}

interface ImportResult {
  created: number;
  updated: number;
  rejected: number;
  details: { status: string; reason?: string }[];
}

type TabId = "contacts" | "mnemoniques" | "abreviations" | "acces" | "postes" | "procedures";

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "contacts", label: "Numéros utiles", icon: <Phone size={15} />, color: "blue" },
  { id: "mnemoniques", label: "Mnémoniques", icon: <BookOpen size={15} />, color: "amber" },
  { id: "abreviations", label: "Abréviations", icon: <Hash size={15} />, color: "purple" },
  { id: "acces", label: "Points d'accès", icon: <MapPin size={15} />, color: "green" },
  { id: "postes", label: "Postes", icon: <Building2 size={15} />, color: "orange" },
  { id: "procedures", label: "Procédures", icon: <ClipboardList size={15} />, color: "blue" },
];

const CONTACT_CATEGORIES = ["urgence", "astreinte", "encadrement", "externe"];
const COULEURS = ["blue", "amber", "red", "green", "purple"];

// ─── Parsing Excel ──────────────────────────────────────────────────────────

async function parseFile(file: File): Promise<ParsedData> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  function getSheet<T>(name: string): T[] {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<T>(ws, { defval: "" });
  }

  // ── Contacts ──
  const contactRaws = getSheet<Record<string, string>>("Contacts");
  const contacts: ContactRow[] = contactRaws.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nom = String(r.nom || "").trim();
    const role = String(r.role || "").trim();
    const categorie = String(r.categorie || "").trim().toLowerCase();
    const telephone = String(r.telephone || "").trim();
    if (!nom) errors.push("Nom manquant");
    if (!role) errors.push("Rôle manquant");
    if (!telephone) errors.push("Téléphone manquant");
    if (!CONTACT_CATEGORIES.includes(categorie)) errors.push(`Catégorie invalide "${categorie}"`);
    return { nom, role, categorie, telephone, telephoneAlt: String(r.telephoneAlt || "").trim() || undefined, note: String(r.note || "").trim() || undefined, disponibilite: String(r.disponibilite || "").trim() || undefined, errors, warnings };
  });

  // ── Mnémoniques ──
  const mnemoRaws = getSheet<Record<string, string>>("Mnemoniques");
  const lettresRaws = getSheet<Record<string, string>>("Mnemoniques_Lettres");
  const mnemoniques: MnemoniqueRow[] = mnemoRaws.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const acronyme = String(r.acronyme || "").trim();
    const titre = String(r.titre || "").trim();
    const description = String(r.description || "").trim();
    const couleur = String(r.couleur || "").trim().toLowerCase();
    if (!acronyme) errors.push("Acronyme manquant");
    if (!titre) errors.push("Titre manquant");
    if (!description) errors.push("Description manquante");
    if (couleur && !COULEURS.includes(couleur)) warnings.push(`Couleur "${couleur}" ignorée`);
    const lettres = lettresRaws
      .filter((l) => String(l.acronyme || "").trim() === acronyme)
      .sort((a, b) => Number(a.ordre) - Number(b.ordre))
      .map((l) => ({
        lettre: String(l.lettre || "").trim(),
        signification: String(l.signification || "").trim(),
        detail: String(l.detail || "").trim() || undefined,
      }));
    if (lettres.length === 0) warnings.push("Aucune lettre trouvée (onglet Mnemoniques_Lettres)");
    return { acronyme, titre, description, contexte: String(r.contexte || "").trim() || undefined, couleur: COULEURS.includes(couleur) ? couleur : undefined, lettres, errors, warnings };
  });

  // ── Abréviations ──
  const abrevRaws = getSheet<Record<string, string>>("Abreviations");
  const abreviations: AbreviationRow[] = abrevRaws.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sigle = String(r.sigle || "").trim();
    const definition = String(r.definition || "").trim();
    if (!sigle) errors.push("Sigle manquant");
    if (!definition) errors.push("Définition manquante");
    return { sigle, definition, errors, warnings };
  });

  // ── Points d'accès ──
  const accesRaws = getSheet<Record<string, string>>("Acces_Rail");
  const acces: AccesRow[] = accesRaws.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const ligne = String(r.ligne || "").trim();
    const pk = String(r.pk || "").trim();
    const nomAffiche = String(r.nomAffiche || "").trim();
    const nomComplet = String(r.nomComplet || "").trim();
    const latitude = Number(r.latitude);
    const longitude = Number(r.longitude);
    if (!ligne) errors.push("Ligne manquante");
    if (!pk) errors.push("PK manquant");
    if (!nomAffiche) errors.push("Nom affiché manquant");
    if (!nomComplet) errors.push("Nom complet manquant");
    if (isNaN(latitude) || latitude < -90 || latitude > 90) errors.push("Latitude invalide");
    if (isNaN(longitude) || longitude < -180 || longitude > 180) errors.push("Longitude invalide");
    return { ligne, pk, type: String(r.type || "").trim() || undefined, identifiant: String(r.identifiant || "").trim() || undefined, nomAffiche, nomComplet, latitude, longitude, description: String(r.description || "").trim() || undefined, errors, warnings };
  });

  // ── Postes ──
  const postesRaws = getSheet<Record<string, string>>("Postes");
  const postes: PosteRow[] = postesRaws.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const slug = String(r.slug || "").trim();
    const nom = String(r.nom || "").trim();
    const typePoste = String(r.typePoste || "").trim();
    if (!slug) errors.push("Slug manquant");
    if (!nom) errors.push("Nom manquant");
    if (!typePoste) errors.push("Type de poste manquant");
    const lignesRaw = String(r.lignes || "").trim();
    const lignes = lignesRaw ? lignesRaw.split("|").map((s) => s.trim()).filter(Boolean) : [];
    const particularitesRaw = String(r.particularites || "").trim();
    const particularites = particularitesRaw ? particularitesRaw.split("|").map((s) => s.trim()).filter(Boolean) : [];
    if (lignes.length === 0) warnings.push("Aucune ligne renseignée");
    return { slug, nom, typePoste, lignes, adresse: String(r.adresse || "").trim(), horaires: String(r.horaires || "").trim(), electrification: String(r.electrification || "").trim(), systemeBlock: String(r.systemeBlock || "").trim(), secteur_slug: String(r.secteur_slug || "").trim() || undefined, particularites, errors, warnings };
  });

  // ── Procédures ──
  const VALID_TYPES = ["cessation", "reprise", "incident", "travaux", "autre"];
  const proceduresRaws = getSheet<Record<string, string>>("Procedures");
  const procedures: ProcedureRow[] = proceduresRaws.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const slug = String(r.slug || "").trim();
    const titre = String(r.titre || "").trim();
    const typeProcedure = String(r.typeProcedure || "").trim().toLowerCase();
    const version = String(r.version || "").trim() || "1.0";
    const etapes_json = String(r.etapes_json || "").trim();
    if (!slug) errors.push("Slug manquant");
    if (!titre) errors.push("Titre manquant");
    if (!VALID_TYPES.includes(typeProcedure)) errors.push(`Type invalide "${typeProcedure}" (cessation|reprise|incident|travaux|autre)`);
    if (!etapes_json) {
      errors.push("etapes_json manquant");
    } else {
      try {
        const parsed = JSON.parse(etapes_json);
        if (!Array.isArray(parsed)) errors.push("etapes_json doit être un tableau JSON");
      } catch {
        errors.push("etapes_json invalide (JSON malformé)");
      }
    }
    const postes_slugs = String(r.postes_slugs || "").trim() || undefined;
    return { slug, titre, typeProcedure, description: String(r.description || "").trim() || undefined, version, etapes_json, postes_slugs, errors, warnings };
  });

  return { contacts, mnemoniques, abreviations, acces, postes, procedures };
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function DonneesImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("contacts");
  const [mode, setMode] = useState<"create" | "upsert">("upsert");
  const [results, setResults] = useState<Partial<Record<TabId, ImportResult>>>({});
  const [importing, setImporting] = useState<Partial<Record<TabId, boolean>>>({});

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseError("Seuls les fichiers .xlsx et .xls sont acceptés.");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    setData(null);
    setResults({});
    try {
      const parsed = await parseFile(file);
      setData(parsed);
      // Basculer sur le premier onglet qui a des données
      const firstWithData = TABS.find((t) => (parsed[t.id] as unknown[]).length > 0);
      if (firstWithData) setActiveTab(firstWithData.id);
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

  function reset() {
    setData(null);
    setParseError(null);
    setResults({});
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImport(tabId: TabId) {
    if (!data) return;
    const items = data[tabId];
    const valid = (items as { errors: string[] }[]).filter((r) => r.errors.length === 0);
    if (valid.length === 0) return;

    const ENDPOINTS: Record<TabId, string> = {
      contacts: "/api/admin/import/contacts",
      mnemoniques: "/api/admin/import/mnemoniques",
      abreviations: "/api/admin/import/abreviations",
      acces: "/api/admin/import/acces-excel",
      postes: "/api/admin/import/postes",
      procedures: "/api/admin/import/procedures",
    };
    const BODY_KEYS: Record<TabId, string> = {
      contacts: "contacts",
      mnemoniques: "mnemoniques",
      abreviations: "abreviations",
      acces: "points",
      postes: "postes",
      procedures: "procedures",
    };

    setImporting((prev) => ({ ...prev, [tabId]: true }));
    try {
      const BATCH_SIZE = 500;
      const aggregated: ImportResult = { created: 0, updated: 0, rejected: 0, details: [] };

      for (let i = 0; i < valid.length; i += BATCH_SIZE) {
        const batch = valid.slice(i, i + BATCH_SIZE);
        const res = await fetch(ENDPOINTS[tabId], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [BODY_KEYS[tabId]]: batch, mode }),
        });
        const result: ImportResult = await res.json();
        if (!res.ok) throw new Error((result as unknown as { error: string }).error || "Erreur lors de l'import.");
        aggregated.created += result.created;
        aggregated.updated += result.updated;
        aggregated.rejected += result.rejected;
        aggregated.details.push(...result.details);
      }

      setResults((prev) => ({ ...prev, [tabId]: aggregated }));
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Erreur serveur.");
    } finally {
      setImporting((prev) => ({ ...prev, [tabId]: false }));
    }
  }

  const tabCounts = data
    ? {
        contacts: data.contacts.length,
        mnemoniques: data.mnemoniques.length,
        abreviations: data.abreviations.length,
        acces: data.acces.length,
        postes: data.postes.length,
        procedures: data.procedures.length,
      }
    : null;

  const totalRows = tabCounts ? Object.values(tabCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/import" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft size={16} /> Import
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Import de données de référence (Excel)</h1>
      </div>

      {/* Étape 1 : Télécharger le modèle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500">1</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 mb-1">Téléchargez le modèle Excel</p>
            <p className="text-sm text-gray-500 mb-3">
              Ce fichier contient toutes les données actuelles : contacts, mnémoniques, abréviations, points d&apos;accès, postes et procédures guidées.
              Modifiez ou complétez les onglets, puis réimportez.
            </p>
            <a
              href="/api/admin/export/donnees"
              download="donnees_reference_astreinte.xlsx"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={15} />
              Télécharger le modèle Excel (données actuelles)
            </a>
          </div>
        </div>
      </div>

      {/* Étape 2 : Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-600">2</div>
        <div className="flex-1">
          <p className="font-semibold text-blue-800 mb-1">Remplissez le fichier</p>
          <ul className="text-sm text-blue-700 space-y-0.5">
            <li>• Onglet <strong>Contacts</strong> : numéros utiles (urgence, astreinte, encadrement, externe)</li>
            <li>• Onglets <strong>Mnemoniques</strong> + <strong>Mnemoniques_Lettres</strong> : mnémoniques et leurs lettres</li>
            <li>• Onglet <strong>Abreviations</strong> : sigles et définitions</li>
            <li>• Onglet <strong>Acces_Rail</strong> : points d&apos;accès ferroviaires (coordonnées GPS requises)</li>
            <li>• Onglet <strong>Postes</strong> : référentiels de postes (champs principaux)</li>
            <li>• Onglet <strong>Procedures</strong> : procédures guidées (JSON des étapes exporté automatiquement)</li>
          </ul>
        </div>
      </div>

      {/* Étape 3 : Import */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500">3</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 mb-3">Importez votre fichier complété</p>

            {!data && !results.contacts && (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-green-300 hover:bg-green-50/40"}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="text-green-500 animate-spin" />
                    <p className="text-gray-600 text-sm">Analyse du fichier en cours…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Upload size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Déposez votre fichier Excel ici</p>
                      <p className="text-xs text-gray-400 mt-1">ou cliquez pour choisir (.xlsx, .xls)</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {parseError && (
              <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Erreur</p>
                  <p>{parseError}</p>
                  <button onClick={reset} className="mt-1 underline hover:no-underline text-xs">Réessayer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Données parsées */}
      {data && (
        <div className="space-y-4">
          {/* Barre d'info + reset */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Fichier{" "}
              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{fileName}</span>
              {" "}— <strong>{totalRows}</strong> ligne(s) au total
            </p>
            <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <X size={13} /> Recommencer
            </button>
          </div>

          {/* Mode d'import */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-6">
            <span className="text-sm font-medium text-gray-700">Mode d&apos;import :</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="upsert" checked={mode === "upsert"} onChange={() => setMode("upsert")} />
              <span className="text-sm text-gray-700">Créer + mettre à jour (recommandé)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="create" checked={mode === "create"} onChange={() => setMode("create")} />
              <span className="text-sm text-gray-700">Créer uniquement</span>
            </label>
          </div>

          {/* Onglets */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {TABS.map((tab) => {
                const count = tabCounts?.[tab.id] ?? 0;
                const rows = data[tab.id] as { errors: string[] }[];
                const errors = rows.filter((r) => r.errors.length > 0).length;
                const isActive = activeTab === tab.id;
                const result = results[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? "border-blue-500 text-blue-700 bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        result ? "bg-green-100 text-green-700" :
                        errors > 0 ? "bg-red-100 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {result ? `✓ ${result.created + result.updated}` : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <TabContent
                tabId={activeTab}
                data={data}
                result={results[activeTab]}
                isImporting={importing[activeTab] ?? false}
                mode={mode}
                onImport={() => handleImport(activeTab)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contenu par onglet ─────────────────────────────────────────────────────

function TabContent({
  tabId, data, result, isImporting, mode, onImport,
}: {
  tabId: TabId;
  data: ParsedData;
  result?: ImportResult;
  isImporting: boolean;
  mode: "create" | "upsert";
  onImport: () => void;
}) {
  const rows = data[tabId] as { errors: string[]; warnings: string[] }[];
  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <p className="text-sm">Aucune donnée dans cet onglet du fichier Excel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Résultat d'import */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 mb-1">Import terminé</p>
              <div className="flex gap-4 text-sm mb-2">
                <span className="text-green-700"><strong>{result.created}</strong> créé(s)</span>
                <span className="text-blue-700"><strong>{result.updated}</strong> mis à jour</span>
                <span className="text-red-700"><strong>{result.rejected}</strong> rejeté(s)</span>
              </div>
              {result.details.filter((d) => d.status === "rejected").length > 0 && (
                <ul className="text-xs text-red-600 space-y-0.5">
                  {result.details.filter((d) => d.status === "rejected").map((d, i) => (
                    <li key={i}>• {d.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600"><strong>{rows.length}</strong> ligne(s)</span>
        <span className="text-green-600"><strong>{valid.length}</strong> valide(s)</span>
        {invalid.length > 0 && <span className="text-red-500"><strong>{invalid.length}</strong> avec erreur(s)</span>}
      </div>

      {/* Tableau selon le type */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {tabId === "contacts" && <ContactsTable rows={data.contacts} />}
        {tabId === "mnemoniques" && <MnemoniquesTable rows={data.mnemoniques} />}
        {tabId === "abreviations" && <AbreviationsTable rows={data.abreviations} />}
        {tabId === "acces" && <AccesTable rows={data.acces} />}
        {tabId === "postes" && <PostesTable rows={data.postes} />}
        {tabId === "procedures" && <ProceduresTable rows={data.procedures} />}
      </div>

      {/* Bouton d'import */}
      {!result && (
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={onImport}
            disabled={isImporting || valid.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
          >
            {isImporting ? (
              <><Loader2 size={15} className="animate-spin" /> Import en cours…</>
            ) : (
              <><Upload size={15} /> Importer {valid.length} ligne(s) valide(s)</>
            )}
          </button>
          {invalid.length > 0 && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle size={14} /> {invalid.length} ligne(s) avec erreurs seront ignorées
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tableaux par type ──────────────────────────────────────────────────────

function RowStatus({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length > 0) {
    return (
      <div className="flex items-start gap-1.5">
        <FileX size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div>{errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} /> Valide</div>
      {warnings.map((w, i) => (
        <p key={i} className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><Info size={11} className="flex-shrink-0" /> {w}</p>
      ))}
    </div>
  );
}

function ContactsTable({ rows }: { rows: ContactRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Nom</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Rôle</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Catégorie</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-36">Téléphone</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Statut</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className={r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
            <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[160px]">{r.nom || <span className="text-red-400 italic">—</span>}</td>
            <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">{r.role}</td>
            <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.categorie}</span></td>
            <td className="px-3 py-2 text-gray-600 font-mono text-xs">{r.telephone}</td>
            <td className="px-3 py-2"><RowStatus errors={r.errors} warnings={r.warnings} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MnemoniquesTable({ rows }: { rows: MnemoniqueRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-24">Acronyme</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Titre</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-16">Lettres</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-20">Couleur</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Statut</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className={r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
            <td className="px-3 py-2 font-bold text-gray-800 font-mono">{r.acronyme || <span className="text-red-400 italic">—</span>}</td>
            <td className="px-3 py-2 text-gray-700 truncate max-w-[200px]">{r.titre}</td>
            <td className="px-3 py-2 text-center text-gray-600">{r.lettres.length}</td>
            <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.couleur || "—"}</span></td>
            <td className="px-3 py-2"><RowStatus errors={r.errors} warnings={r.warnings} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AbreviationsTable({ rows }: { rows: AbreviationRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Sigle</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Définition</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Statut</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className={r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
            <td className="px-3 py-2 font-bold text-gray-800 font-mono">{r.sigle || <span className="text-red-400 italic">—</span>}</td>
            <td className="px-3 py-2 text-gray-600">{r.definition}</td>
            <td className="px-3 py-2"><RowStatus errors={r.errors} warnings={r.warnings} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AccesTable({ rows }: { rows: AccesRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-24">Ligne</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-20">PK</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Nom affiché</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Type</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-32">Coordonnées</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Statut</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className={r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
            <td className="px-3 py-2 font-mono text-xs text-gray-700">{r.ligne}</td>
            <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.pk}</td>
            <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[160px]">{r.nomAffiche}</td>
            <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.type || "—"}</span></td>
            <td className="px-3 py-2 font-mono text-xs text-gray-500">{isNaN(r.latitude) ? "—" : `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}</td>
            <td className="px-3 py-2"><RowStatus errors={r.errors} warnings={r.warnings} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PostesTable({ rows }: { rows: PosteRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Nom</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-20">Slug</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-20">Type</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Lignes</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Secteur</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Statut</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className={r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
            <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[160px]">{r.nom || <span className="text-red-400 italic">—</span>}</td>
            <td className="px-3 py-2 font-mono text-xs text-gray-500 truncate">{r.slug}</td>
            <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.typePoste || "—"}</span></td>
            <td className="px-3 py-2 text-xs text-gray-600">{r.lignes.join(", ") || "—"}</td>
            <td className="px-3 py-2 text-xs text-gray-600">{r.secteur_slug || "—"}</td>
            <td className="px-3 py-2"><RowStatus errors={r.errors} warnings={r.warnings} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProceduresTable({ rows }: { rows: ProcedureRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Titre</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-32">Slug</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-24">Type</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-14">Version</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">Postes</th>
          <th className="text-left px-3 py-2.5 font-medium text-gray-600">Statut</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => {
          let etapeCount = 0;
          try { etapeCount = (JSON.parse(r.etapes_json) as unknown[]).length; } catch { /* ignore */ }
          return (
            <tr key={i} className={r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
              <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[180px]">{r.titre || <span className="text-red-400 italic">—</span>}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-500 truncate">{r.slug || <span className="text-red-400 italic">—</span>}</td>
              <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.typeProcedure || "—"}</span></td>
              <td className="px-3 py-2 text-xs text-gray-600 font-mono">{r.version}</td>
              <td className="px-3 py-2 text-xs text-gray-600">
                {r.errors.length === 0 ? (
                  <span title={r.postes_slugs || ""}>{etapeCount} étape{etapeCount > 1 ? "s" : ""}{r.postes_slugs ? ` · ${r.postes_slugs.split("|").length} poste(s)` : ""}</span>
                ) : "—"}
              </td>
              <td className="px-3 py-2"><RowStatus errors={r.errors} warnings={r.warnings} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
