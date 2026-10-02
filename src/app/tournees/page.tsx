export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, Users, User, Route, History, PlayCircle, MapPin, MessageSquarePlus } from "lucide-react";
import { requireUserSession } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import TourneeHeader from "@/components/tournee/TourneeHeader";
import { formatDateCourte } from "@/lib/tournee/time";
import RejoindreCodeForm from "./RejoindreCodeForm";

const STATUT_LABEL: Record<string, string> = {
  PREPARATION: "En préparation",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function TourneesPage() {
  const user = await requireUserSession();
  const actifs = ["PREPARATION", "EN_COURS"];

  const [mesEnCours, equipesOuvertes, modeles, historique] = await Promise.all([
    prisma.tourneeRealisation.findMany({
      where: { statut: { in: actifs }, participants: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { participants: true } } },
    }),
    prisma.tourneeRealisation.findMany({
      where: { mode: "EQUIPE", statut: { in: actifs }, participants: { none: { userId: user.id } } },
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { participants: true } },
        createdBy: { select: { prenom: true, nom: true } },
      },
    }),
    prisma.tourneeModele.findMany({
      where: { statut: "PUBLIE" },
      orderBy: { titre: "asc" },
      include: { _count: { select: { etapes: true } } },
    }),
    prisma.tourneeRealisation.findMany({
      where: { statut: { in: ["TERMINEE", "ANNULEE"] }, participants: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <TourneeHeader back="/" backLabel="Accueil" surtitre="Terrain" titre="Tournées terrain" sousTitre="Parcours guidés, seul ou en équipe." />

      <div className="px-4 py-5 space-y-6 lg:px-8">
        <RejoindreCodeForm />

        {mesEnCours.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Mes tournées en cours</h2>
            <div className="card divide-y divide-slate-100">
              {mesEnCours.map((r) => (
                <Link key={r.id} href={`/tournees/r/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <PlayCircle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{r.titre}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateCourte(r.date)} · {r.mode === "EQUIPE" ? `Équipe · ${r._count.participants} participant(s)` : "Solo"} ·{" "}
                      {STATUT_LABEL[r.statut]}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {equipesOuvertes.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Tournées d&apos;équipe ouvertes</h2>
            <div className="card divide-y divide-slate-100">
              {equipesOuvertes.map((r) => (
                <Link key={r.id} href={`/tournees/r/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-shrink-0">
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{r.titre}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateCourte(r.date)} · Référent {r.createdBy.prenom} {r.createdBy.nom} · {r._count.participants} participant(s)
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-1 rounded-lg">Rejoindre</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Parcours disponibles</h2>
          {modeles.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <Route size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun parcours publié pour le moment.</p>
            </div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {modeles.map((m) => (
                <Link key={m.id} href={`/tournees/modeles/${m.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{m.titre}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {m.sousTitre ? `${m.sousTitre} · ` : ""}Départ {m.heureDepart} · {m._count.etapes} étapes
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link href="/tournees/contributions" className="card px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50">
          <MessageSquarePlus size={18} className="text-slate-500" />
          <span className="flex-1 text-sm font-semibold text-slate-700">Mes contributions</span>
          <ChevronRight size={18} className="text-slate-300" />
        </Link>

        {historique.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <History size={12} /> Historique
            </h2>
            <div className="card divide-y divide-slate-100">
              {historique.map((r) => (
                <Link key={r.id} href={`/tournees/r/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  {r.mode === "EQUIPE" ? <Users size={16} className="text-slate-400" /> : <User size={16} className="text-slate-400" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{r.titre}</p>
                    <p className="text-xs text-slate-400">{formatDateCourte(r.date)} · {STATUT_LABEL[r.statut]}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
