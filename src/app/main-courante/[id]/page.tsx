import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, User, CheckCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/user-auth";
import { getMainCouranteById, getFicheBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function MainCouranteDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/main-courante");

  const { id } = await params;
  const entry = await getMainCouranteById(id);

  if (!entry) notFound();

  // Seuls les auteurs et admins/éditeurs peuvent voir les entrées non validées
  const canView =
    entry.status === "validated" ||
    entry.auteurId === user.id ||
    user.role === "ADMIN" ||
    user.role === "EDITOR";

  if (!canView) notFound();

  const ficheLinked = entry.ficheSlug ? await getFicheBySlug(entry.ficheSlug) : null;
  const displayDescription = entry.editedDescription ?? entry.description;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="px-4 pt-5 pb-5 lg:px-8 bg-blue-900 text-white">
        <Link
          href="/main-courante"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Main courante
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={16} className="opacity-70" />
          <span className="text-xs font-bold opacity-60 uppercase tracking-wide">Entrée validée</span>
        </div>
        <h1 className="text-xl font-bold leading-tight">{entry.titre}</h1>
        <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-70">
          <span className="flex items-center gap-1">
            <User size={11} />
            Soumis par {entry.auteurPrenom} {entry.auteurNom}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatDate(entry.createdAt)}
          </span>
          {entry.validatedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle size={11} />
              Validé le {formatDate(entry.validatedAt)}
              {entry.validatedByNom && ` par ${entry.validatedByPrenom} ${entry.validatedByNom}`}
            </span>
          )}
        </div>
      </div>

      <div className="py-5 px-4 lg:px-8 space-y-5">
        {/* Contenu */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {displayDescription}
          </p>
        </div>

        {/* Fiche liée */}
        {ficheLinked && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
              Fiche réflexe associée
            </p>
            <Link
              href={`/fiches/${ficheLinked.slug}`}
              className="flex items-center justify-between text-sm font-semibold text-blue-800 hover:text-blue-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen size={14} />
                {ficheLinked.titre}
              </span>
              <span className="text-xs text-blue-500">Ouvrir →</span>
            </Link>
          </div>
        )}

        {/* Contribution originale (si editedDescription différent) */}
        {entry.editedDescription && entry.editedDescription !== entry.description && (
          <details className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <summary className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
              Voir la contribution originale
            </summary>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed whitespace-pre-wrap">
              {entry.description}
            </p>
          </details>
        )}

        <div className="pt-2">
          <Link
            href="/main-courante"
            className="text-sm text-blue-700 font-medium hover:underline"
          >
            ← Retour à la main courante
          </Link>
        </div>
      </div>
    </div>
  );
}
