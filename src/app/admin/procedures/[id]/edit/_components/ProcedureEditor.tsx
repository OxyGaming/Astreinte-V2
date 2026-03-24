"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProcedureForm } from "@/lib/procedure/form-types";
import { validateProcedureForm } from "@/lib/procedure/form-types";
import MetaTab from "./MetaTab";
import EtapesTab from "./EtapesTab";
import PostesTab from "./PostesTab";
import PreviewModal from "./PreviewModal";
import { Save, Eye, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  initialForm: ProcedureForm;
  postes: { id: string; nom: string; slug: string }[];
}

type Tab = "meta" | "etapes" | "postes";

export default function ProcedureEditor({ initialForm, postes }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProcedureForm>(initialForm);
  const [activeTab, setActiveTab] = useState<Tab>("meta");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isNew = !form.id;

  const handleSave = async () => {
    const validationErrors = validateProcedureForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const payload = {
        slug: form.slug,
        titre: form.titre,
        typeProcedure: form.typeProcedure,
        description: form.description || null,
        version: form.version,
        etapes: form.etapes.map((etape) => ({
          id: etape.id,
          titre: etape.titre,
          description: etape.description || undefined,
          icone: etape.icone || undefined,
          ordre: form.etapes.indexOf(etape),
          actions: etape.actions.map((action) => ({
            id: action.id,
            type: action.type,
            label: action.label,
            description: action.description || undefined,
            note: action.note || undefined,
            niveau: action.niveau,
            obligatoire: action.type === "information" ? false : action.obligatoire,
            verifiable: action.verifiable,
            reponseAttendue: action.reponseAttendue !== null ? action.reponseAttendue : undefined,
            reponsesDisponibles: action.reponsesDisponibles.length > 0 ? action.reponsesDisponibles : undefined,
            contactId: action.contactId || undefined,
            referenceDoc: action.referenceDoc || undefined,
          })),
        })),
        posteIds: form.posteIds,
      };

      let res: Response;
      if (isNew) {
        res = await fetch("/api/admin/procedures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/procedures/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setErrors([{ field: "global", message: data.error ?? "Erreur lors de l'enregistrement" }]);
        return;
      }

      const saved = await res.json();
      if (isNew) {
        router.replace(`/admin/procedures/${saved.id}/edit`);
      } else {
        setForm((f) => ({ ...f })); // force re-render
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "meta", label: "Métadonnées" },
    { id: "etapes", label: `Étapes & Actions${form.etapes.length > 0 ? ` (${form.etapes.length})` : ""}` },
    { id: "postes", label: `Postes associés${form.posteIds.length > 0 ? ` (${form.posteIds.length})` : ""}` },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/procedures" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? "Nouvelle procédure" : (form.titre || "Procédure sans titre")}
            </h1>
            {!isNew && <p className="text-gray-400 text-sm font-mono mt-0.5">{form.slug}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} />
            Aperçu
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          ✓ Procédure enregistrée avec succès.
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{e.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === "meta" && <MetaTab form={form} onChange={setForm} />}
        {activeTab === "etapes" && <EtapesTab form={form} onChange={setForm} />}
        {activeTab === "postes" && <PostesTab form={form} onChange={setForm} postes={postes} />}
      </div>

      {/* Preview modal */}
      {showPreview && (
        <PreviewModal form={form} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
