"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, Info, Phone, Gauge, Link2, PenLine } from "lucide-react";
import ContactPicker from "@/components/admin/ContactPicker";
import type { TourneeAProposSection, TourneeContactRef, TourneeSeuils } from "@/lib/tournee/types";
import { inputCls, labelCls } from "./editor-types";

export interface ModeleInfos {
  id: string;
  titre: string;
  sousTitre: string | null;
  description: string | null;
  objectif: string | null;
  heureDepart: string;
  mentionDiffusion: string | null;
  statut: string;
  seuils: TourneeSeuils;
  aPropos: TourneeAProposSection[];
  contacts: TourneeContactRef[];
}

const newId = () => Math.random().toString(36).slice(2, 10);

const SUGGESTIONS_APROPOS = ["Objectif", "Contexte", "Organisation", "Matériel", "Consignes générales", "Points particuliers"];

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function ModeleInfosForm({ initial }: { initial: ModeleInfos }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const set = <K extends keyof ModeleInfos>(k: K, v: ModeleInfos[K]) => setF((p) => ({ ...p, [k]: v }));
  const setSeuil = (k: keyof TourneeSeuils, v: string) => set("seuils", { ...f.seuils, [k]: Number(v) || 0 });
  const updSection = (i: number, patch: Partial<TourneeAProposSection>) =>
    set("aPropos", f.aPropos.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const updContact = (i: number, patch: Partial<TourneeContactRef>) =>
    set("contacts", f.contacts.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tournees/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'enregistrement");
      setToast({ type: "success", message: "Informations enregistrées" });
      router.refresh();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Informations générales</h2>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <div className="p-4 sm:p-6 space-y-5">
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {toast.message}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Titre <span className="text-red-500">*</span></label>
            <input className={inputCls} value={f.titre} onChange={(e) => set("titre", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sous-titre</label>
            <input className={inputCls} value={f.sousTitre ?? ""} onChange={(e) => set("sousTitre", e.target.value)} placeholder="ex : Secteur Nord" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Départ</label>
              <input className={inputCls} type="time" value={f.heureDepart} onChange={(e) => set("heureDepart", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={f.statut} onChange={(e) => set("statut", e.target.value)}>
                <option value="BROUILLON">Brouillon</option>
                <option value="PUBLIE">Publié</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Objectif</label>
            <input className={inputCls} value={f.objectif ?? ""} onChange={(e) => set("objectif", e.target.value)} placeholder="En une phrase" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} resize-y`} rows={2} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Mention de diffusion <span className="text-gray-400 font-normal text-xs">(pied de page du PDF)</span></label>
            <input className={inputCls} value={f.mentionDiffusion ?? ""} onChange={(e) => set("mentionDiffusion", e.target.value)} />
          </div>
        </div>

        {/* Seuils */}
        <fieldset className="border border-gray-200 rounded-xl p-4">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5"><Gauge size={12} /> Seuils de pilotage</legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tolérance « dans les temps » (min)</label>
              <input className={inputCls} type="number" min={0} value={f.seuils.toleranceMin} onChange={(e) => setSeuil("toleranceMin", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Retard rouge à partir de (min)</label>
              <input className={inputCls} type="number" min={1} value={f.seuils.rougeMin} onChange={(e) => setSeuil("rougeMin", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Marge confortable optionnelles (min)</label>
              <input className={inputCls} type="number" min={0} value={f.seuils.margeConfortMin} onChange={(e) => setSeuil("margeConfortMin", e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* À propos */}
        <fieldset className="border border-gray-200 rounded-xl p-4 space-y-3">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5"><Info size={12} /> À propos de cette tournée</legend>
          {f.aPropos.map((s, i) => (
            <div key={s.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/60">
              <div className="flex gap-2 items-center">
                <input className={inputCls} placeholder="Titre de la rubrique" value={s.titre} onChange={(e) => updSection(i, { titre: e.target.value })} />
                <button type="button" onClick={() => set("aPropos", move(f.aPropos, i, -1))} className="text-gray-400 hover:text-gray-700"><ChevronUp size={15} /></button>
                <button type="button" onClick={() => set("aPropos", move(f.aPropos, i, 1))} className="text-gray-400 hover:text-gray-700"><ChevronDown size={15} /></button>
                <button type="button" onClick={() => set("aPropos", f.aPropos.filter((_, k) => k !== i))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <textarea className={`${inputCls} resize-y`} rows={3} value={s.texte} onChange={(e) => updSection(i, { texte: e.target.value })}
                placeholder="« - » pour une puce, **gras**" />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS_APROPOS.filter((t) => !f.aPropos.some((s) => s.titre === t)).map((t) => (
              <button key={t} type="button" onClick={() => set("aPropos", [...f.aPropos, { id: newId(), titre: t, texte: "" }])}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700">
                + {t}
              </button>
            ))}
            <button type="button" onClick={() => set("aPropos", [...f.aPropos, { id: newId(), titre: "", texte: "" }])}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700 flex items-center gap-1">
              <Plus size={11} /> Rubrique libre
            </button>
          </div>
        </fieldset>

        {/* Contacts */}
        <fieldset className="border border-gray-200 rounded-xl p-4 space-y-3">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5"><Phone size={12} /> Contacts utiles</legend>
          {f.contacts.map((c, i) => {
            const lie = c.contactId !== undefined;
            return (
              <div key={c.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <input className={inputCls} placeholder="Fonction (ex : Responsable de la tournée)" value={c.fonction} onChange={(e) => updContact(i, { fonction: e.target.value })} />
                  <button type="button" onClick={() => set("contacts", move(f.contacts, i, -1))} className="text-gray-400 hover:text-gray-700"><ChevronUp size={15} /></button>
                  <button type="button" onClick={() => set("contacts", move(f.contacts, i, 1))} className="text-gray-400 hover:text-gray-700"><ChevronDown size={15} /></button>
                  <button type="button" onClick={() => set("contacts", f.contacts.filter((_, k) => k !== i))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="flex gap-1 text-xs">
                  <button type="button" onClick={() => updContact(i, { contactId: "", nom: undefined, telephone: undefined })}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 ${lie ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}>
                    <Link2 size={11} /> Contact de l&apos;annuaire
                  </button>
                  <button type="button" onClick={() => updContact(i, { contactId: undefined, nom: c.nom ?? "", telephone: c.telephone ?? "" })}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 ${!lie ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}>
                    <PenLine size={11} /> Saisie libre
                  </button>
                </div>
                {lie ? (
                  <ContactPicker value={c.contactId ?? ""} onChange={(id) => updContact(i, { contactId: id })} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="Nom" value={c.nom ?? ""} onChange={(e) => updContact(i, { nom: e.target.value })} />
                    <input className={inputCls} placeholder="Téléphone" inputMode="tel" value={c.telephone ?? ""} onChange={(e) => updContact(i, { telephone: e.target.value })} />
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={() => set("contacts", [...f.contacts, { id: newId(), fonction: "", nom: "", telephone: "" }])}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={14} /> Ajouter un contact
          </button>
        </fieldset>
      </div>
    </div>
  );
}
