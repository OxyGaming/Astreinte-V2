import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Route, User } from "lucide-react";
import { requireContributionManagerSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  CONTRIBUTION_STATUT_LABELS,
  CONTRIBUTION_STATUT_STYLE,
  CONTRIBUTION_TYPE_LABELS,
  type ContributionStatut,
  type ContributionType,
} from "@/lib/tournee/contributions";
import { photoUrl } from "@/lib/tournee/image-client";
import ContributionTraitement from "./ContributionTraitement";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const HISTO_LABEL: Record<string, string> = {
  CREATION: "Contribution créée",
  STATUT: "Statut",
  AFFECTATION: "Affectation",
  DATE_TRAITEMENT: "Date de traitement",
  COMMENTAIRE: "Commentaire",
};

export default async function AdminContributionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireContributionManagerSession();
  const { id } = await params;
  const [c, gestionnaires] = await Promise.all([
    prisma.tourneeContribution.findUnique({
      where: { id },
      include: {
        auteur: { select: { prenom: true, nom: true, username: true } },
        realisation: { select: { id: true, titre: true, date: true, mode: true } },
        modele: { select: { id: true, titre: true } },
        photos: { orderBy: { ordre: "asc" }, select: { id: true } },
        historique: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { actif: true, status: "approved" },
      orderBy: [{ role: "asc" }, { nom: "asc" }],
      select: { id: true, prenom: true, nom: true, role: true },
    }),
  ]);
  if (!c) notFound();

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/admin/tournees/contributions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> Contributions
      </Link>

      <div className="flex items-start gap-3 flex-wrap mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{CONTRIBUTION_TYPE_LABELS[c.type as ContributionType] ?? c.type}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1.5 ${CONTRIBUTION_STATUT_STYLE[c.statut as ContributionStatut]}`}>
          {CONTRIBUTION_STATUT_LABELS[c.statut as ContributionStatut]}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p className="flex items-center gap-2 text-gray-600"><User size={14} /> {c.auteur.prenom} {c.auteur.nom} · {fmt(c.createdAt)}</p>
              {(c.modele || c.realisation) && (
                <p className="flex items-center gap-2 text-gray-600">
                  <Route size={14} />
                  {c.modele ? (
                    user.role === "ADMIN" ? (
                      <Link href={`/admin/tournees/${c.modele.id}`} className="text-blue-700 hover:underline">{c.modele.titre}</Link>
                    ) : c.modele.titre
                  ) : c.realisation?.titre}
                </p>
              )}
              {c.etapeTitre && <p className="flex items-center gap-2 text-gray-600"><MapPin size={14} /> Étape : {c.etapeTitre}</p>}
              {c.realisation && (
                <p className="text-gray-500">
                  Tournée du {c.realisation.date.split("-").reverse().join("/")} ({c.realisation.mode === "EQUIPE" ? "équipe" : "solo"}){" "}
                  <Link href={`/tournees/r/${c.realisation.id}`} className="text-blue-700 inline-flex items-center gap-0.5 hover:underline">voir <ExternalLink size={11} /></Link>
                </p>
              )}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
              <p className="text-gray-800 whitespace-pre-wrap">{c.description || <span className="text-gray-400">(aucune — photo seule)</span>}</p>
            </div>
            {c.photos.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Photos ({c.photos.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {c.photos.map((p) => (
                    <a key={p.id} href={photoUrl(p.id)} target="_blank" rel="noopener" className="block rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl(p.id)} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {c.modele && user.role === "ADMIN" && (
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                Pour faire évoluer le parcours, modifiez le <Link href={`/admin/tournees/${c.modele.id}`} className="text-blue-700 hover:underline">modèle</Link> : la contribution ne le modifie pas d&apos;elle-même.
              </p>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Historique</h2>
            <ol className="relative border-l border-gray-200 ml-2 space-y-4">
              {c.historique.map((h) => (
                <li key={h.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-white border-2 border-blue-500" />
                  <p className="text-xs text-gray-400">{fmt(h.createdAt)} · {h.actorNom}</p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{HISTO_LABEL[h.type] ?? h.type}</span>
                    {h.type !== "CREATION" && h.type !== "COMMENTAIRE" && (
                      <> : {h.ancienneValeur ?? "—"} → <strong>{h.nouvelleValeur ?? "—"}</strong></>
                    )}
                  </p>
                  {h.message && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mt-1 whitespace-pre-wrap">{h.message}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <ContributionTraitement
          id={c.id}
          statut={c.statut}
          assigneeId={c.assigneeId}
          traiteLe={c.traiteLe?.toISOString().slice(0, 10) ?? null}
          gestionnaires={gestionnaires.map((u) => ({ id: u.id, nom: `${u.prenom} ${u.nom}`, role: u.role }))}
        />
      </div>
    </div>
  );
}
