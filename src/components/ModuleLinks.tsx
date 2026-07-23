"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";

/**
 * Bandeau de navigation harmonisé du triangle **RCI ↔ Livret CIL ↔ Session**.
 *
 * Rendu à l'identique sur les trois modules : l'opérateur y retrouve toujours
 * ses deux voisins, avec les **mêmes repères** (couleur par module, chevron =
 * ouvrir, « + » = créer). Modèle 1:1:1 : chaque voisin est unique.
 *
 * Pour chaque voisin :
 *  - **déjà lié** → pill « ouvrir › » vers le module ;
 *  - **absent** → pill « + créer » :
 *      · RCI / Livret → création directe, liée automatiquement au module courant ;
 *      · Session → passe par le choix d'une fiche (`/fiches?link…`), car une
 *        session se démarre toujours depuis une fiche réflexe.
 */

type Self = "session" | "rci" | "cil";

const COLORS = {
  rci: {
    create: "border-indigo-300 text-indigo-800 bg-white hover:bg-indigo-50",
    open: "border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100",
  },
  cil: {
    create: "border-rose-300 text-rose-800 bg-white hover:bg-rose-50",
    open: "border-rose-200 text-rose-800 bg-rose-50 hover:bg-rose-100",
  },
  session: {
    create: "border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50",
    open: "border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100",
  },
} as const;

const BASE =
  "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl border transition-colors flex-shrink-0 disabled:opacity-50";

export default function ModuleLinks({
  self,
  selfId,
  rci = null,
  cil = null,
  session = null,
}: {
  self: Self;
  /** Id du module courant (session/rci/cil) — sert de contexte de rattachement. */
  selfId: string;
  /** Voisin RCI déjà lié (présent sauf si `self === "rci"`). */
  rci?: { id: string } | null;
  /** Voisin Livret CIL déjà lié (présent sauf si `self === "cil"`). */
  cil?: { id: string } | null;
  /** Voisin Session déjà lié — `ficheSlug` pour ouvrir la vue live. */
  session?: { ficheSlug: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createRci() {
    setBusy(true);
    try {
      // Depuis une session → lie la session ; depuis un Livret → lie le Livret.
      const body =
        self === "session" ? { sessionId: selfId } : { cilIncidentId: selfId };
      const res = await fetch("/api/rci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Création impossible");
        return;
      }
      const created = await res.json();
      router.push(`/rci/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  function createCil() {
    const q = self === "session" ? `sessionId=${selfId}` : `rciId=${selfId}`;
    router.push(`/cil/new?${q}`);
  }

  function createSession() {
    // Une session se démarre depuis une fiche : on emmène l'opérateur choisir
    // la fiche, en gardant le module à rattacher dans l'URL.
    const q = self === "rci" ? `linkRci=${selfId}` : `linkCil=${selfId}`;
    router.push(`/fiches?${q}`);
  }

  function Pill({
    module,
    label,
    href,
    onCreate,
  }: {
    module: Self;
    label: string;
    href?: string;
    onCreate?: () => void;
  }) {
    if (href) {
      return (
        <Link
          href={href}
          className={`${BASE} ${COLORS[module].open}`}
          title={`Ouvrir : ${label}`}
        >
          {label}
          <Icon.ChevronRight className="w-3.5 h-3.5" />
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className={`${BASE} ${COLORS[module].create}`}
        title={`Créer : ${label}`}
      >
        <Icon.Plus className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  }

  return (
    <>
      {self !== "rci" && (
        <Pill
          module="rci"
          label="RCI"
          href={rci ? `/rci/${rci.id}` : undefined}
          onCreate={createRci}
        />
      )}
      {self !== "cil" && (
        <Pill
          module="cil"
          label="Livret CIL"
          href={cil ? `/cil/${cil.id}` : undefined}
          onCreate={createCil}
        />
      )}
      {self !== "session" && (
        <Pill
          module="session"
          label="Session"
          href={session ? `/fiches/${session.ficheSlug}` : undefined}
          onCreate={createSession}
        />
      )}
    </>
  );
}
