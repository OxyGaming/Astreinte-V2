import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, User, CheckCircle, Tag, ShieldAlert, Wrench, FileText, Lightbulb } from "lucide-react";
import { getCurrentUser } from "@/lib/user-auth";
import { getMainCouranteById, getFicheBySlug } from "@/lib/db";
import { getNatureColors } from "@/lib/main-courante-colors";

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
  // description publiée : si l'admin a édité l'editedDescription (legacy), on l'affiche en priorité ;
  // sinon description.
  const description = entry.editedDescription ?? entry.description;

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

        {/* Nature + Libellé */}
        {(entry.nature || entry.libelle) && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {entry.nature && (
              <span className={`inline-flex items-center gap-1 ${getNatureColors(entry.nature).chipOnDark} text-xs font-bold px-2 py-0.5 rounded`}>
                <Tag size={11} />
                {entry.nature}
              </span>
            )}
            {entry.libelle && (
              <span className="text-xs opacity-80 font-medium">{entry.libelle}</span>
            )}
          </div>
        )}

        <h1 className="text-xl font-bold leading-tight">
          {entry.titre ?? (
            <span className="italic opacity-80 font-normal">Sans titre</span>
          )}
        </h1>
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

      <div className="py-5 px-4 lg:px-8 space-y-4">
        {/* Description (situation) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-slate-500" />
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Description</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </section>

        {/* Solution */}
        {entry.solution && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-green-600" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Solution</h2>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {entry.solution}
            </p>
          </section>
        )}

        {/* Avis sécurité */}
        {entry.avisSecurite && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={14} className="text-amber-600" />
              <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide">Avis sécurité</h2>
            </div>
            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
              {entry.avisSecurite}
            </p>
          </section>
        )}

        {/* Avis production */}
        {entry.avisProduction && (
          <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={14} className="text-indigo-600" />
              <h2 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Avis production</h2>
            </div>
            <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
              {entry.avisProduction}
            </p>
          </section>
        )}

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
