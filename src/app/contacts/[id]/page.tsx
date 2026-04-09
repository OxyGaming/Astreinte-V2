import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronRight } from "lucide-react";
import { getContactWithFiches } from "@/lib/db";
import ContactCard from "@/components/ContactCard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const contact = await getContactWithFiches(id);
  if (!contact) notFound();

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-5 pb-4 lg:px-8">
        <Link
          href="/contacts"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Contacts utiles
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{contact.nom}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{contact.role}</p>
      </div>

      <div className="px-4 py-5 space-y-5 lg:px-8">
        {/* Fiche contact complète */}
        <div className="card">
          <ContactCard contact={contact} mode="full" showLink={false} />
        </div>

        {/* Fiches associées */}
        {contact.fiches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-slate-400" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Fiches associées ({contact.fiches.length})
              </h2>
            </div>
            <div className="card divide-y divide-slate-100">
              {contact.fiches
                .sort((a, b) => a.numero - b.numero)
                .map((f) => (
                  <Link
                    key={f.id}
                    href={`/fiches/${f.slug}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-8 flex-shrink-0">
                        {f.numero.toString().padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{f.titre}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </Link>
                ))}
            </div>
          </section>
        )}

        {contact.fiches.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4 italic">
            Ce contact n&apos;est lié à aucune fiche.
          </p>
        )}
      </div>
    </div>
  );
}
