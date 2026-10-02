"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

/** Saisie du code de partage d'une tournée d'équipe. */
export default function RejoindreCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length >= 4) router.push(`/tournees/rejoindre/${clean}`);
      }}
      className="card p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-shrink-0">
        <KeyRound size={18} />
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code de tournée (ex. K7M2QX)"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={10}
        className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm uppercase tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <button
        type="submit"
        disabled={clean.length < 4}
        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
      >
        Rejoindre
      </button>
    </form>
  );
}
