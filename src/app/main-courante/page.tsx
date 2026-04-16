import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/user-auth";
import { getValidatedMainCourantes } from "@/lib/db";
import MainCouranteList from "./MainCouranteList";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function MainCourantePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/main-courante");

  const { q } = await searchParams;
  const entries = await getValidatedMainCourantes(q);

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="px-4 pt-5 pb-5 lg:px-8 bg-blue-900 text-white">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Accueil
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={18} className="opacity-80" />
              <span className="text-xs font-bold opacity-60 uppercase tracking-wide">Mémoire collective</span>
            </div>
            <h1 className="text-xl font-bold leading-tight">Main courante</h1>
            <p className="text-sm opacity-80 mt-1">
              Bonnes pratiques et points de vigilance validés par les administrateurs.
            </p>
          </div>
          <Link
            href="/main-courante/new"
            className="flex-shrink-0 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={14} />
            Contribuer
          </Link>
        </div>
      </div>

      <div className="py-5 space-y-4 px-4 lg:px-8">
        {/* Liens rapides */}
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/main-courante/mes-soumissions"
            className="text-xs text-blue-700 font-medium hover:underline"
          >
            Mes soumissions →
          </Link>
        </div>

        {/* Recherche */}
        <MainCouranteList initialEntries={entries} initialQuery={q ?? ""} />
      </div>
    </div>
  );
}
