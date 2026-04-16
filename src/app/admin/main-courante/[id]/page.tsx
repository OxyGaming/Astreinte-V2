import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, BookOpen } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMainCouranteById, getFicheBySlug } from "@/lib/db";
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
  const redirect = await requireAdminSession();
  if (redirect) return redirect;

  const { id } = await params;
  const entry = await getMainCouranteById(id);
  if (!entry) notFound();

  const ficheLinked = entry.ficheSlug ? await getFicheBySlug(entry.ficheSlug) : null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/main-courante"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Main courante
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-800 mb-1">{entry.titre}</h1>

      {/* Méta */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-6">
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

      {/* Contribution originale */}
      <div className="mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
          Contribution originale
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {entry.description}
          </p>
        </div>
      </div>

      {/* Formulaire de modération */}
      <AdminMainCouranteForm entry={entry} />
    </div>
  );
}
