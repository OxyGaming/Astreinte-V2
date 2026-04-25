"use client";

/**
 * PendingOpsBadge — bandeau global indiquant le nombre d'opérations en attente
 * de synchronisation dans la file IndexedDB.
 *
 * Visible uniquement quand au moins une op est en attente. Cliquable, mène
 * vers la liste des sessions où l'utilisateur peut voir le détail.
 *
 * Le compte est rafraîchi via l'événement `IDB_CHANGE_EVENT` diffusé par
 * idb-offline.ts après chaque mutation, plus l'événement `online` pour
 * capturer la fin d'un drain. Pas de polling : tout est piloté par événement.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { count as countOps, IDB_CHANGE_EVENT } from "@/lib/idb-offline";

export default function PendingOpsBadge() {
  const pathname = usePathname();
  const [n, setN] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const c = await countOps();
        if (!cancelled) setN(c);
      } catch {
        // IDB indisponible (SSR, mode privé, navigateur ancien) — silencieux
      }
    };
    refresh();
    window.addEventListener(IDB_CHANGE_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(IDB_CHANGE_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  // Pas de badge sur les pages d'authentification ni dans le back-office
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/admin")
  ) return null;

  if (n === 0) return null;

  return (
    <Link
      href="/sessions"
      className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
    >
      <CloudUpload size={13} className="flex-shrink-0" />
      <span>
        {n} opération{n > 1 ? "s" : ""} en attente de synchronisation
      </span>
      <span className="ml-auto text-amber-700 underline">Voir</span>
    </Link>
  );
}
