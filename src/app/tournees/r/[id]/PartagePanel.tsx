"use client";

import { useState } from "react";
import { Share2, Copy, Check, KeyRound } from "lucide-react";

/** Partage d'une tournée d'équipe : lien direct + code court. */
export default function PartagePanel({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "lien" | null>(null);
  const lien = typeof window !== "undefined" ? `${window.location.origin}/tournees/rejoindre/${code}` : `/tournees/rejoindre/${code}`;

  async function copy(what: "code" | "lien") {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : lien);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rejoindre la tournée", text: `Code de tournée : ${code}`, url: lien });
        return;
      } catch {
        /* annulé */
      }
    }
    void copy("lien");
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><KeyRound size={13} /> Inviter l&apos;équipe</p>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-center text-3xl font-black tracking-[0.3em] font-mono text-violet-800 bg-violet-50 rounded-xl py-2">{code}</span>
        <button onClick={() => copy("code")} className="p-3 rounded-xl bg-slate-100 text-slate-600" title="Copier le code">
          {copied === "code" ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
        </button>
      </div>
      <button onClick={share} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm">
        {copied === "lien" ? <Check size={16} /> : <Share2 size={16} />} {copied === "lien" ? "Lien copié" : "Partager le lien"}
      </button>
      <p className="text-xs text-slate-400">Toute personne connectée peut rejoindre avec ce code ou ce lien — inutile de l&apos;ajouter individuellement.</p>
    </div>
  );
}
