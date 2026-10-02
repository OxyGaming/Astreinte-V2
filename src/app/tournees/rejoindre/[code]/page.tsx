export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireUserSession } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadRealisation, normaliserCode } from "@/lib/tournee/server";
import { rejoindreRealisation, TourneeError } from "@/lib/tournee/realisation";
import TourneeHeader from "@/components/tournee/TourneeHeader";

/**
 * Lien / code de partage : rejoint la tournée d'équipe puis ouvre l'écran
 * terrain. Les codes erronés sont limités (anti-énumération).
 */
export default async function RejoindrePage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUserSession();
  const code = normaliserCode((await params).code);
  const found = code
    ? await prisma.tourneeRealisation.findUnique({ where: { codePartage: code }, select: { id: true } })
    : null;

  let erreur: string | null = null;
  if (!found) {
    const rl = checkRateLimit(`tournee-code:${user.id}`);
    erreur = rl.allowed
      ? "Aucune tournée ne correspond à ce code."
      : "Trop de codes erronés. Réessayez dans quelques minutes.";
  } else {
    const r = await loadRealisation(found.id);
    try {
      await rejoindreRealisation(user, r!);
    } catch (e) {
      if (!(e instanceof TourneeError)) throw e;
      erreur = e.message;
    }
    if (!erreur) redirect(`/tournees/r/${found.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <TourneeHeader back="/tournees" backLabel="Tournées" titre="Rejoindre une tournée" />
      <div className="px-4 py-8 text-center space-y-4">
        <KeyRound size={32} className="mx-auto text-slate-300" />
        <p className="text-slate-700">{erreur}</p>
        <p className="text-sm text-slate-400 font-mono tracking-widest">{code || "—"}</p>
        <Link href="/tournees" className="inline-block px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">Retour aux tournées</Link>
      </div>
    </div>
  );
}
