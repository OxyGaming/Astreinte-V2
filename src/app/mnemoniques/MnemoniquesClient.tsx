"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Mnemonique } from "@/lib/types";

const couleurClasses = {
  blue: {
    header: "bg-blue-800 text-white",
    lettre: "bg-blue-700 text-white",
    badge: "bg-blue-100 text-blue-800",
    border: "border-blue-200",
  },
  amber: {
    header: "bg-amber-600 text-white",
    lettre: "bg-amber-500 text-white",
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-200",
  },
  red: {
    header: "bg-red-700 text-white",
    lettre: "bg-red-600 text-white",
    badge: "bg-red-100 text-red-800",
    border: "border-red-200",
  },
  green: {
    header: "bg-green-700 text-white",
    lettre: "bg-green-600 text-white",
    badge: "bg-green-100 text-green-800",
    border: "border-green-200",
  },
  purple: {
    header: "bg-purple-800 text-white",
    lettre: "bg-purple-700 text-white",
    badge: "bg-purple-100 text-purple-800",
    border: "border-purple-200",
  },
};

export default function MnemoniquesClient({ mnemoniques }: { mnemoniques: Mnemonique[] }) {
  const [open, setOpen] = useState<string | null>(mnemoniques[0]?.id ?? null);

  const toggle = (id: string) => setOpen(open === id ? null : id);

  return (
    <div className="px-4 py-5 space-y-3 lg:px-8">
      {mnemoniques.map((m) => {
        const colors = couleurClasses[m.couleur ?? "blue"];
        const isOpen = open === m.id;

        return (
          <div
            key={m.id}
            className={`rounded-2xl overflow-hidden border ${colors.border} shadow-sm`}
          >
            {/* En-tête cliquable */}
            <button
              onClick={() => toggle(m.id)}
              className={`w-full flex items-start justify-between p-4 text-left ${colors.header}`}
            >
              <div>
                <div className="text-2xl font-black tracking-widest leading-none mb-1">
                  {m.acronyme}
                </div>
                <div className="text-sm font-semibold opacity-90">{m.titre}</div>
                {m.contexte && (
                  <div className="text-xs opacity-70 mt-1 leading-relaxed max-w-xs">
                    {m.contexte}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 mt-1">
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {/* Contenu développé */}
            {isOpen && (
              <div className="bg-white">
                <p className="px-4 pt-3 pb-2 text-sm text-slate-600 leading-relaxed border-b border-slate-100">
                  {m.description}
                </p>
                <div className="divide-y divide-slate-100">
                  {m.lettres.map((l, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${colors.lettre}`}
                      >
                        {l.lettre}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">
                          {l.signification}
                        </p>
                        {l.detail && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {l.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
