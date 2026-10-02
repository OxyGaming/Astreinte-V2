"use client";

import { X } from "lucide-react";
import type { TourneePlanEtape } from "@/lib/tournee/types";
import EtapeContenu from "@/components/tournee/EtapeContenu";

/** Feuille plein écran (mobile) / modale (desktop) avec le détail d'une étape. */
export default function EtapeSheet({
  etape,
  entete,
  actions,
  onClose,
}: {
  etape: TourneePlanEtape;
  entete?: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-lg leading-tight">{etape.titre}</h3>
            {entete && <div className="text-xs text-slate-500 mt-1">{entete}</div>}
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-700" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">
          <EtapeContenu etape={etape} />
        </div>
        {actions && <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2">{actions}</div>}
      </div>
    </div>
  );
}
