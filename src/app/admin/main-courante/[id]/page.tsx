import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, BookOpen, Tag } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMainCouranteById, getFicheBySlug, getAllFiches } from "@/lib/db";
import { getNatureColors } from "@/lib/main-courante-colors";
import AdminMainCouranteForm from "./AdminMainCouranteForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminMainCouranteDetailPage({ params }: Props) {
  await requireAdminSession();

  const { id } = await params;
  const [entry, fiches] = await Promise.all([
    getMainCouranteById(id),
    getAllFiches(),
  ]);
  if (!entry) notFound();

  const ficheLinked = entry.ficheSlug ? await getFicheBySlug(entry.ficheSlug) : null;

  return (
    <div className="max-w-3xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/main-courante"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Mains courantes
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-800 mb-1">
        {entry.titre || (
          <span className="italic text-slate-400 font-normal">
            Sans titre — à compléter
          </span>
        )}
      </h1>

      {/* Méta */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-6 mt-2">
        {entry.nature && (
          <span className={`inline-flex items-center gap-1 ${getNatureColors(entry.nature).chip} font-bold px-2 py-0.5 rounded-md`}>
            <Tag size={10} />
            {entry.nature}
            {entry.libelle && <span className="font-normal opacity-80">— {entry.libelle}</span>}
          </span>
        )}
        <span className="flex items-center gap-1">
          <User size={11} />
          {entry.auteurPrenom} {entry.auteurNom}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {formatDate(entry.createdAt)}
        </span>
        {ficheLinked && (
          <span className="flex items-center gap-1 text-blue-600">
            <BookOpen size={11} />
            Fiche : {ficheLinked.titre}
          </span>
        )}
      </div>

      {/* Contribution originale (snapshot — non modifiable) */}
      <details className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <summary className="text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none">
          Contribution originale (snapshot avant édition)
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          {entry.nature && (
            <p><span className="font-semibold text-slate-600">Nature :</span> {entry.nature}</p>
          )}
          {entry.libelle && (
            <p><span className="font-semibold text-slate-600">Libellé :</span> {entry.libelle}</p>
          )}
          <div>
            <p className="font-semibold text-slate-600 mb-1">Description :</p>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.description}</p>
          </div>
          {entry.solution && (
            <div>
              <p className="font-semibold text-slate-600 mb-1">Solution :</p>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.solution}</p>
            </div>
          )}
        </div>
      </details>

      {/* Formulaire de modération */}
      <AdminMainCouranteForm entry={entry} fiches={fiches} />
    </div>
  );
}
