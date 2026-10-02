"use client";

import { useState } from "react";
import { Navigation, MapPin, EyeOff, BookOpen, Library, Camera, ExternalLink, X, AlertTriangle, Target, Info } from "lucide-react";
import type { TourneeBloc, TourneePlanEtape } from "@/lib/tournee/types";
import { formatGps, navigationUrl } from "@/lib/tournee/navigation";
import { photoUrl } from "@/lib/tournee/image-client";
import TexteConsigne from "./TexteConsigne";

export function NaviguerButton({ lat, lng, label = "Naviguer", compact = false }: { lat: number; lng: number; label?: string; compact?: boolean }) {
  return (
    <a
      href={navigationUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors ${
        compact ? "text-xs px-3 py-2" : "text-sm px-4 py-3"
      }`}
    >
      <Navigation size={compact ? 13 : 16} />
      {label}
    </a>
  );
}

const BLOC_STYLE: Record<TourneeBloc["type"], { box: string; icon: typeof Info | null; title: string }> = {
  SECTION: { box: "", icon: null, title: "text-blue-900" },
  ATTENTION: { box: "bg-red-50 border-l-4 border-red-500 rounded-r-xl p-3", icon: AlertTriangle, title: "text-red-800" },
  EXERCICE: { box: "bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-3", icon: Target, title: "text-amber-900" },
  INFO: { box: "bg-sky-50 border-l-4 border-sky-500 rounded-r-xl p-3", icon: Info, title: "text-sky-900" },
};

export function Bloc({ bloc }: { bloc: TourneeBloc }) {
  const s = BLOC_STYLE[bloc.type];
  const Icon = s.icon;
  return (
    <div className={s.box}>
      {bloc.titre && (
        <p className={`font-bold text-sm mb-1 flex items-center gap-1.5 ${s.title}`}>
          {Icon && <Icon size={14} />}
          {bloc.titre}
        </p>
      )}
      {bloc.lieu && (
        <div className="flex items-center gap-2 flex-wrap mb-1.5 text-xs text-slate-500">
          <MapPin size={12} />
          <span>
            {bloc.lieu.libelle} · {formatGps(bloc.lieu.latitude, bloc.lieu.longitude)}
          </span>
          <NaviguerButton lat={bloc.lieu.latitude} lng={bloc.lieu.longitude} compact label="Y aller" />
        </div>
      )}
      <TexteConsigne texte={bloc.texte} className="text-slate-700" />
    </div>
  );
}

export function PhotosGrid({ photos }: { photos: TourneePlanEtape["photos"] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  const cur = open !== null ? photos[open] : null;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <button key={p.id} onClick={() => setOpen(i)} className="relative rounded-xl overflow-hidden bg-slate-100 aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(p.id)} alt={p.caption ?? ""} loading="lazy" className="w-full h-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
            {p.caption && (
              <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[11px] px-2 py-1 text-left truncate">{p.caption}</span>
            )}
          </button>
        ))}
      </div>
      {cur && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col" onClick={() => setOpen(null)}>
          <div className="flex justify-between items-center p-3 text-white">
            <span className="text-sm">{cur.caption ?? `Photo ${open! + 1} / ${photos.length}`}</span>
            <button className="p-2" aria-label="Fermer"><X size={22} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(cur.id)} alt={cur.caption ?? ""} className="max-w-full max-h-full object-contain" />
          </div>
          {photos.length > 1 && (
            <div className="flex justify-center gap-4 p-4" onClick={(e) => e.stopPropagation()}>
              <button className="text-white px-4 py-2 bg-white/10 rounded-lg" onClick={() => setOpen((open! - 1 + photos.length) % photos.length)}>‹ Précédente</button>
              <button className="text-white px-4 py-2 bg-white/10 rounded-lg" onClick={() => setOpen((open! + 1) % photos.length)}>Suivante ›</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Rubrique({ icon: Icon, titre, children }: { icon: typeof Info; titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Icon size={12} /> {titre}
      </h4>
      {children}
    </section>
  );
}

/** Détail d'une étape : localisation, consignes, référentiels, photos. */
export default function EtapeContenu({ etape, showNavigate = true }: { etape: TourneePlanEtape; showNavigate?: boolean }) {
  const hasGps = etape.latitude != null && etape.longitude != null;
  return (
    <div className="space-y-4">
      {etape.description && <p className="text-sm text-slate-600">{etape.description}</p>}

      <Rubrique icon={MapPin} titre="Localisation">
        {etape.localisationMasquee && !hasGps ? (
          <p className="text-sm text-amber-700 flex items-center gap-1.5"><EyeOff size={14} /> Non communiquée — à trouver par vos propres moyens.</p>
        ) : (
          <div className="space-y-2">
            {etape.adresse && <p className="text-sm text-slate-700">{etape.adresse}</p>}
            {hasGps ? (
              <div className="flex items-center gap-3 flex-wrap">
                {showNavigate && <NaviguerButton lat={etape.latitude!} lng={etape.longitude!} />}
                <span className="text-xs text-slate-400 font-mono">{formatGps(etape.latitude!, etape.longitude!)}</span>
                {etape.localisationMasquee && <span className="text-xs text-amber-700 flex items-center gap-1"><EyeOff size={12} /> masquée aux participants</span>}
              </div>
            ) : (
              !etape.adresse && <p className="text-sm text-slate-400">Pas de coordonnées renseignées.</p>
            )}
          </div>
        )}
      </Rubrique>

      {etape.contenu.length > 0 && (
        <Rubrique icon={BookOpen} titre="Consignes">
          <div className="space-y-3">
            {etape.contenu.map((b) => <Bloc key={b.id} bloc={b} />)}
          </div>
        </Rubrique>
      )}

      {etape.liens.length > 0 && (
        <Rubrique icon={Library} titre="Référentiels">
          <div className="space-y-1.5">
            {etape.liens.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-sm font-medium text-blue-800">
                <Library size={14} className="flex-shrink-0" />
                <span className="flex-1 truncate">{l.libelle}</span>
                <ExternalLink size={13} className="text-slate-400" />
              </a>
            ))}
          </div>
        </Rubrique>
      )}

      {etape.photos.length > 0 && (
        <Rubrique icon={Camera} titre={`Photos (${etape.photos.length})`}>
          <PhotosGrid photos={etape.photos} />
        </Rubrique>
      )}
    </div>
  );
}
