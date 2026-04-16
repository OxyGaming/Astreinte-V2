import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/user-auth";
import { getAllFiches } from "@/lib/db";
import NewMainCouranteForm from "./NewMainCouranteForm";

export const dynamic = "force-dynamic";

export default async function NewMainCourantePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/main-courante/new");

  const fiches = await getAllFiches();

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <div className="px-4 pt-5 pb-5 lg:px-8 bg-blue-900 text-white">
        <Link
          href="/main-courante"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Main courante
        </Link>
        <h1 className="text-xl font-bold leading-tight">Contribuer</h1>
        <p className="text-sm opacity-80 mt-1">
          Partagez un cas particulier, une bonne pratique ou un point de vigilance.
          Votre contribution sera examinée avant publication.
        </p>
      </div>

      <div className="py-5 px-4 lg:px-8">
        <NewMainCouranteForm fiches={fiches} />
      </div>
    </div>
  );
}
