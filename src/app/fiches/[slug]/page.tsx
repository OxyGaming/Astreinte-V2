import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle, ChevronRight, Phone, BookOpen } from "lucide-react";
import { getFicheBySlug, getAllContacts, getActiveSession, getSessionJournal, getCheckedActionsForSession } from "@/lib/db";
import PhoneButton from "@/components/PhoneButton";
import FicheSessionView from "@/components/FicheSessionView";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function FicheDetailPage({ params }: Props) {
  const { slug } = await params;
  const [fiche, user] = await Promise.all([getFicheBySlug(slug), getCurrentUser()]);
  if (!fiche) notFound();

  const allContacts = await getAllContacts();
  const contactsLies = fiche.contacts_lies
    ? allContacts.filter((c) => fiche.contacts_lies!.includes(c.id))
    : [];

  // Load active session if user is logged in
  const session = user ? await getActiveSession(slug) : null;

  // Load journal + checked state for session
  const [journal, checkedLogs] = session
    ? await Promise.all([
        getSessionJournal(session.id),
        getCheckedActionsForSession(session.id),
      ])
    : [[], []];

  // Build checked map (only "checked" type = true)
  const initialChecked: Record<string, boolean> = {};
  for (const log of checkedLogs) {
    initialChecked[`etape_${log.etapeOrdre}_action_${log.actionIndex}`] = log.type === "checked";
  }

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div
        className={`px-4 pt-5 pb-5 lg:px-8 ${
          fiche.priorite === "urgente" ? "bg-red-700" : "bg-blue-900"
        } text-white`}
      >
        <Link
          href="/fiches"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Fiches réflexes
        </Link>

        <div className="flex items-start gap-2 mb-2">
          <span className="text-xs font-bold opacity-60 mt-1 flex-shrink-0">
            FICHE {fiche.numero.toString().padStart(2, "0")}
          </span>
        </div>
        <h1 className="text-xl font-bold leading-tight">{fiche.titre}</h1>
        <p className="text-sm opacity-80 mt-2 leading-relaxed">{fiche.resume}</p>

        {fiche.mnemonique && (
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider">
            <BookOpen size={12} />
            {fiche.mnemonique}
          </div>
        )}
      </div>

      <div className="py-5 space-y-5">

        {/* Avis obligatoires */}
        {fiche.avis_obligatoires && fiche.avis_obligatoires.length > 0 && (
          <div className="mx-4 lg:mx-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
              Avis obligatoires
            </p>
            <div className="flex flex-wrap gap-2">
              {fiche.avis_obligatoires.map((a) => (
                <span
                  key={a}
                  className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-lg"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Session interactive (si utilisateur connecté) */}
        {user ? (
          <FicheSessionView
            fiche={fiche}
            user={user}
            initialSession={session}
            initialJournal={journal}
            initialChecked={initialChecked}
          />
        ) : (
          /* Lecture seule sans session */
          <section className="px-4 lg:px-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Conduite à tenir
            </h2>
            <div className="space-y-3">
              {fiche.etapes.map((etape) => (
                <div
                  key={etape.ordre}
                  className={`rounded-xl overflow-hidden border ${
                    etape.critique ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className={`px-4 py-3 flex items-start gap-3 ${etape.critique ? "border-b border-red-200" : ""}`}>
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        etape.critique ? "bg-red-600 text-white" : "bg-blue-800 text-white"
                      }`}
                    >
                      {etape.ordre}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{etape.titre}</h3>
                        {etape.critique && <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{etape.description}</p>
                    </div>
                  </div>
                  {etape.actions && etape.actions.length > 0 && (
                    <div className="px-4 py-3">
                      <ul className="space-y-1.5">
                        {etape.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle size={14} className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-500" : "text-blue-500"}`} />
                            <span className="text-sm text-slate-700 leading-snug">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contacts liés */}
        {contactsLies.length > 0 && (
          <section className="px-4 lg:px-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Contacts utiles
            </h2>
            <div className="card divide-y divide-slate-100">
              {contactsLies.map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <p className="font-semibold text-slate-800 text-sm">{c.nom}</p>
                  <p className="text-xs text-slate-500 mb-2">{c.role}</p>
                  <PhoneButton number={c.telephone} />
                </div>
              ))}
              <Link
                href="/contacts"
                className="flex items-center justify-between px-4 py-3 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <span className="text-sm font-medium">Tous les contacts</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </section>
        )}

        {/* Références */}
        {fiche.references && fiche.references.length > 0 && (
          <section className="px-4 lg:px-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Références réglementaires
            </h2>
            <div className="flex flex-wrap gap-2">
              {fiche.references.map((ref) => (
                <span
                  key={ref}
                  className="bg-slate-100 text-slate-700 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg"
                >
                  {ref}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
