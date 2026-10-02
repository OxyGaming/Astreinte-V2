"use client";

import { useState } from "react";
import {
  X, AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, MapPin, Link2, PenLine, Pencil, Clock, BookOpen,
} from "lucide-react";
import LienForm from "@/components/admin/LienForm";
import type { Lien, LienRef } from "@/lib/types";
import { parseCoordonnees, validerEtape } from "@/lib/tournee/parse";
import {
  TOURNEE_BLOC_TYPES,
  TOURNEE_BLOC_TYPE_LABELS,
  TOURNEE_ETAPE_TYPES,
  TOURNEE_ETAPE_TYPE_LABELS,
  type TourneeBloc,
  type TourneeEtapeType,
} from "@/lib/tournee/types";
import { inputCls, labelCls, type EditorEtape } from "./editor-types";

interface Props {
  entry: EditorEtape | null;
  collection: Lien[];
  onSave: (entry: EditorEtape) => void;
  onClose: () => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);
const numStr = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function Section({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-gray-200 rounded-xl p-4 space-y-3">
      <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
        <Icon size={12} />
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function CoordsInput({
  lat, lng, onChange,
}: { lat: string; lng: string; onChange: (lat: string, lng: string) => void }) {
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} inputMode="decimal" placeholder="Latitude" value={lat} onChange={(e) => onChange(e.target.value, lng)} />
        <input className={inputCls} inputMode="decimal" placeholder="Longitude" value={lng} onChange={(e) => onChange(lat, e.target.value)} />
      </div>
      <input
        className={`${inputCls} ${err ? "border-red-400" : ""}`}
        placeholder="…ou coller « 45.6045, 4.7926 » / un lien Google Maps"
        value={paste}
        onChange={(e) => {
          setPaste(e.target.value);
          const c = parseCoordonnees(e.target.value);
          setErr(!!e.target.value.trim() && !c);
          if (c) {
            onChange(String(c.latitude), String(c.longitude));
            setPaste("");
          }
        }}
      />
    </div>
  );
}

export default function TourneeEtapeForm({ entry, collection, onSave, onClose }: Props) {
  const [type, setType] = useState<TourneeEtapeType>(entry?.type ?? "POINT");
  const [titre, setTitre] = useState(entry?.titre ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [optionnelle, setOptionnelle] = useState(entry?.optionnelle ?? false);
  const [dureeMin, setDureeMin] = useState(numStr(entry?.dureeMin ?? 10));
  const [trajet, setTrajet] = useState(numStr(entry?.trajetSuivanteMin ?? 10));
  const [surcout, setSurcout] = useState(numStr(entry?.surcoutTrajetMin ?? 0));
  const [heureImposee, setHeureImposee] = useState(entry?.heureImposee ?? "");
  const [adresse, setAdresse] = useState(entry?.adresse ?? "");
  const [lat, setLat] = useState(numStr(entry?.latitude));
  const [lng, setLng] = useState(numStr(entry?.longitude));
  const [masquee, setMasquee] = useState(entry?.localisationMasquee ?? false);
  const [blocs, setBlocs] = useState<TourneeBloc[]>(entry?.contenu ?? []);
  const [liens, setLiens] = useState<LienRef[]>(entry?.liens ?? []);
  const [lienModal, setLienModal] = useState<{ index: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updBloc = (i: number, patch: Partial<TourneeBloc>) =>
    setBlocs((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const moveBloc = (i: number, d: -1 | 1) =>
    setBlocs((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = {
      id: entry?.id,
      type,
      titre,
      description,
      optionnelle,
      heureImposee,
      dureeMin,
      trajetSuivanteMin: trajet,
      surcoutTrajetMin: surcout,
      adresse,
      latitude: lat.trim() === "" ? null : lat,
      longitude: lng.trim() === "" ? null : lng,
      localisationMasquee: masquee,
      liens,
      contenu: blocs.map((b) => ({
        ...b,
        lieu: b.lieu && (b.lieu.latitude || b.lieu.longitude) ? b.lieu : null,
      })),
    };
    const r = validerEtape(raw);
    if (!r.ok) return setError(r.error.replace(/^Étape : /, ""));
    onSave({ ...r.value, photos: entry?.photos ?? [] });
  }

  const resolveLien = (ref: LienRef) => {
    if (ref.lienId) {
      const l = collection.find((c) => c.id === ref.lienId);
      return { libelle: ref.libelle || l?.libelle || "Lien indisponible", url: l?.url ?? "", linked: true };
    }
    return { libelle: ref.libelle || ref.url || "", url: ref.url ?? "", linked: false };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{entry ? "Modifier l'étape" : "Ajouter une étape"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Général */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as TourneeEtapeType)}>
                {TOURNEE_ETAPE_TYPES.map((t) => (
                  <option key={t} value={t}>{TOURNEE_ETAPE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Titre <span className="text-red-500">*</span></label>
              <input autoFocus className={inputCls} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex : Point A de la gare" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description courte <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex : ITE, ancien BV…" />
          </div>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            <input type="checkbox" className="mt-0.5" checked={optionnelle} onChange={(e) => setOptionnelle(e.target.checked)} />
            <span>
              <span className="font-medium text-gray-800">Étape optionnelle</span>
              <span className="block text-xs text-gray-500">
                Hors chaîne horaire : réalisable si la marge avant la prochaine échéance le permet. Le participant peut l&apos;ignorer.
              </span>
            </span>
          </label>

          {/* Temps */}
          <Section icon={Clock} title="Temps">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Présence (min)</label>
                <input className={inputCls} type="number" min={0} value={dureeMin} onChange={(e) => setDureeMin(e.target.value)} />
              </div>
              {optionnelle ? (
                <div>
                  <label className={labelCls}>Détour (min)</label>
                  <input className={inputCls} type="number" min={0} value={surcout} onChange={(e) => setSurcout(e.target.value)} />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Trajet suivante (min)</label>
                    <input className={inputCls} type="number" min={0} value={trajet} onChange={(e) => setTrajet(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Heure imposée</label>
                    <input className={inputCls} type="time" value={heureImposee} onChange={(e) => setHeureImposee(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {optionnelle
                ? "Détour = temps de trajet supplémentaire induit si l'étape est réalisée."
                : "Trajet vers l'étape obligatoire suivante. Heure imposée = échéance (réservation, rendez-vous) : l'étape ne commence pas avant."}
            </p>
          </Section>

          {/* Localisation */}
          <Section icon={MapPin} title="Localisation">
            <input className={inputCls} value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse ou description du lieu (optionnel)" />
            <CoordsInput lat={lat} lng={lng} onChange={(a, b) => { setLat(a); setLng(b); }} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={masquee} onChange={(e) => setMasquee(e.target.checked)} />
              Localisation non communiquée aux participants <span className="text-xs text-gray-400">(exercice)</span>
            </label>
          </Section>

          {/* Consignes */}
          <Section icon={BookOpen} title="Consignes & points d'attention">
            <p className="text-xs text-gray-400">
              Texte : « - » pour une puce, « -- » pour une sous-puce, **gras**. Un bloc peut porter un sous-point localisé (ex. « Point B »).
            </p>
            {blocs.map((b, i) => (
              <div key={b.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/60">
                <div className="flex gap-2 items-center">
                  <select className={`${inputCls} !w-auto`} value={b.type} onChange={(e) => updBloc(i, { type: e.target.value as TourneeBloc["type"] })}>
                    {TOURNEE_BLOC_TYPES.map((t) => (
                      <option key={t} value={t}>{TOURNEE_BLOC_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <input className={inputCls} placeholder="Titre (ex : Points d'attention)" value={b.titre ?? ""} onChange={(e) => updBloc(i, { titre: e.target.value })} />
                  <div className="flex flex-col">
                    <button type="button" onClick={() => moveBloc(i, -1)} className="text-gray-400 hover:text-gray-700"><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => moveBloc(i, 1)} className="text-gray-400 hover:text-gray-700"><ChevronDown size={14} /></button>
                  </div>
                  <button type="button" onClick={() => setBlocs((p) => p.filter((_, k) => k !== i))} className="text-gray-300 hover:text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea className={`${inputCls} resize-y`} rows={4} value={b.texte} onChange={(e) => updBloc(i, { texte: e.target.value })} />
                {b.lieu ? (
                  <div className="space-y-2 border-t border-gray-200 pt-2">
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder="Libellé du sous-point (ex : Point B)" value={b.lieu.libelle}
                        onChange={(e) => updBloc(i, { lieu: { ...b.lieu!, libelle: e.target.value } })} />
                      <button type="button" onClick={() => updBloc(i, { lieu: null })} className="text-xs text-gray-500 hover:text-red-600 whitespace-nowrap">Retirer</button>
                    </div>
                    <CoordsInput
                      lat={numStr(b.lieu.latitude || null)}
                      lng={numStr(b.lieu.longitude || null)}
                      onChange={(a, c) => updBloc(i, { lieu: { ...b.lieu!, latitude: Number(a.replace(",", ".")) || 0, longitude: Number(c.replace(",", ".")) || 0 } })}
                    />
                  </div>
                ) : (
                  <button type="button" onClick={() => updBloc(i, { lieu: { libelle: b.titre || "", latitude: 0, longitude: 0 } })}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <MapPin size={11} /> Ajouter un sous-point localisé
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setBlocs((p) => [...p, { id: newId(), type: "SECTION", titre: "", texte: "" }])}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={14} /> Ajouter un bloc
            </button>
          </Section>

          {/* Référentiels */}
          <Section icon={Link2} title="Référentiels & documents">
            {liens.length === 0 && <p className="text-xs text-gray-400">Aucun référentiel rattaché.</p>}
            {liens.map((ref, i) => {
              const r = resolveLien(ref);
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.linked ? <Link2 size={13} className="text-blue-500 flex-shrink-0" /> : <PenLine size={13} className="text-gray-400 flex-shrink-0" />}
                  <span className="flex-1 truncate">{r.libelle}</span>
                  <button type="button" onClick={() => setLienModal({ index: i })} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={13} /></button>
                  <button type="button" onClick={() => setLiens((p) => p.filter((_, k) => k !== i))} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                </div>
              );
            })}
            <button type="button" onClick={() => setLienModal({ index: null })}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={14} /> Ajouter un référentiel
            </button>
          </Section>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={14} /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              {entry ? "Valider" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>

      {lienModal && (
        <LienForm
          entry={lienModal.index !== null ? liens[lienModal.index] : null}
          collection={collection}
          onSave={(ref) => {
            setLiens((p) => (lienModal.index !== null ? p.map((x, k) => (k === lienModal.index ? ref : x)) : [...p, ref]));
            setLienModal(null);
          }}
          onClose={() => setLienModal(null)}
        />
      )}
    </div>
  );
}
