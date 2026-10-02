import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";

/** En-tête bleu des pages du module (même gabarit que les autres hubs). */
export default function TourneeHeader({
  back,
  backLabel,
  surtitre = "Tournées terrain",
  titre,
  sousTitre,
  children,
}: {
  back: string;
  backLabel: string;
  surtitre?: string;
  titre: string;
  sousTitre?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-blue-900 text-white px-4 pt-5 pb-5 lg:px-8">
      <Link href={back} className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity">
        <ArrowLeft size={16} />
        {backLabel}
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Route size={16} className="opacity-80" />
        <span className="text-xs font-bold opacity-60 uppercase tracking-widest">{surtitre}</span>
      </div>
      <h1 className="text-xl font-bold leading-tight">{titre}</h1>
      {sousTitre && <div className="text-sm opacity-80 mt-1">{sousTitre}</div>}
      {children}
    </div>
  );
}
