export const dynamic = "force-dynamic";

import { getPosteBySlug, resolveLiens } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AnnuaireSection } from "@/lib/types";
import {
  Building2,
  MapPin,
  Clock,
  Train,
  AlertTriangle,
  Eye,
  BookOpen,
  ChevronLeft,
  Zap,
  Users,
  Thermometer,
  ClipboardCheck,
  CheckCircle2,
  Wrench,
  FileText,
  Download,
  Link2,
} from "lucide-react";
import PhoneButton from "@/components/PhoneButton";
import LiensList from "@/components/LiensList";
import PosteAnnuaire from "./PosteAnnuaire";
import { formatFileSize, formatDocumentDate } from "@/lib/documents";

const TYPE_PROCEDURE_META: Record<string, { label: string; sublabel: string; icon: React.ElementType; bg: string; iconColor: string }> = {
  cessation: { label: "Cessation de service", sublabel: "Lancer la procédure guidée", icon: ClipboardCheck, bg: "bg-blue-700 hover:bg-blue-800", iconColor: "text-amber-400" },
  reprise:   { label: "Reprise de service",   sublabel: "Lancer la procédure guidée", icon: CheckCircle2,  bg: "bg-green-700 hover:bg-green-800", iconColor: "text-white" },
  incident:  { label: "Gestion d'incident",   sublabel: "Lancer la procédure guidée", icon: AlertTriangle, bg: "bg-amber-600 hover:bg-amber-700", iconColor: "text-white" },
  travaux:   { label: "Travaux",              sublabel: "Lancer la procédure guidée", icon: Wrench,        bg: "bg-orange-600 hover:bg-orange-700", iconColor: "text-white" },
  autre:     { label: "Procédures",           sublabel: "Lancer la procédure guidée", icon: BookOpen,      bg: "bg-slate-700 hover:bg-slate-800", iconColor: "text-white" },
};


export default async function PosteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [poste, procedureTypes, posteRow] = await Promise.all([
    getPosteBySlug(slug),
    prisma.posteProcedure.findMany({
      where: { poste: { slug } },
      include: { procedure: { select: { typeProcedure: true } } },
    }).then((rows) => [...new Set(rows.map((r) => r.procedure.typeProcedure))]),
    prisma.poste.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  if (!poste) notFound();
  const liensUtiles = await resolveLiens(poste.liens ?? []);

  const documents = posteRow
    ? await prisma.document.findMany({
        where: { posteId: posteRow.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, originalName: true, size: true, createdAt: true },
      })
    : [];

  // ── Résolution des contacts liés ────────────────────────────────────────────
  // On collecte tous les contactIds référencés dans l'annuaire, puis on résout
  // leurs données depuis la DB (téléphone live, disponibilité, etc.).
  const linkedContactIds = poste.annuaire.flatMap((section) =>
    section.contacts.filter((c) => c.contactId).map((c) => c.contactId!)
  );

  const resolvedContacts =
    linkedContactIds.length > 0
      ? await prisma.contact.findMany({
          where: { id: { in: linkedContactIds } },
          select: { id: true, nom: true, role: true, telephone: true, telephoneAlt: true, disponibilite: true },
        })
      : [];

  const contactMap = new Map(resolvedContacts.map((c) => [c.id, c]));

  // Annuaire avec contacts liés résolus (téléphone toujours à jour)
  const annuaire: AnnuaireSection[] = poste.annuaire.map((section) => ({
    ...section,
    contacts: section.contacts.map((contact) => {
      if (!contact.contactId) return contact; // entrée libre → inchangée
      const resolved = contactMap.get(contact.contactId);
      if (!resolved) {
        // Contact supprimé → afficher le snapshot avec indicateur orphelin
        return { ...contact, orphan: true };
      }
      return {
        ...contact,
        nom: contact.nom || resolved.nom, // label override ou nom du contact
        role: resolved.role,
        telephone: resolved.telephone,
        telephoneAlt: resolved.telephoneAlt ?? undefined,
        disponibilite: resolved.disponibilite ?? undefined,
        linked: true,
        orphan: false,
      };
    }),
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link
        href="/postes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft size={16} />
        Référentiels
      </Link>

      {/* Header */}
      <div className="bg-blue-900 text-white rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-800 rounded-xl">
            <Building2 size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{poste.nom}</h1>
            <p className="text-blue-300 text-sm mt-0.5">{poste.type_poste}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-blue-800/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-blue-300 text-xs mb-1">
              <Train size={12} />
              Ligne{poste.lignes.length > 1 ? "s" : ""}
            </div>
            <p className="text-white text-sm font-medium">{poste.lignes.join(", ")}</p>
          </div>
          <div className="bg-blue-800/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-blue-300 text-xs mb-1">
              <Zap size={12} />
              Électrification
            </div>
            <p className="text-white text-sm font-medium">{poste.electrification}</p>
          </div>
          <div className="bg-blue-800/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-blue-300 text-xs mb-1">
              <Clock size={12} />
              Horaires
            </div>
            <p className="text-white text-sm font-medium leading-snug">{poste.horaires}</p>
          </div>
          <div className="bg-blue-800/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-blue-300 text-xs mb-1">
              <MapPin size={12} />
              Adresse
            </div>
            <p className="text-white text-sm font-medium leading-snug">{poste.adresse}</p>
          </div>
        </div>
      </div>

      {/* Procédures guidées — bouton d'entrée générique */}
      {procedureTypes.length > 0 && (
        <Link
          href={`/postes/${slug}/procedures`}
          className="flex items-center justify-between bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-3.5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ClipboardCheck size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold">Procédures associées au poste</p>
              <p className="text-xs text-blue-300 mt-0.5">
                Choisissez et lancez une procédure
                {procedureTypes.length > 1 && ` · ${procedureTypes.length} types disponibles`}
              </p>
            </div>
          </div>
          <ChevronLeft size={18} className="text-blue-300 rotate-180" />
        </Link>
      )}

      {/* Annuaire */}
      <PosteAnnuaire annuaire={annuaire} />

      {/* Circuits de voie */}
      <section>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
          <Eye size={18} className="text-blue-700" />
          Circuits de voie à surveiller
        </h2>
        <div className="space-y-2">
          {poste.circuits_voie.map((cv) => (
            <div
              key={cv.designation}
              className={`rounded-xl border p-3.5 ${
                cv.delai_max
                  ? "bg-orange-50 border-orange-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{cv.designation}</p>
                  {cv.voie && (
                    <p className="text-xs text-slate-600 mt-0.5">{cv.voie}</p>
                  )}
                  {cv.note && (
                    <p className="text-xs text-slate-500 mt-1">{cv.note}</p>
                  )}
                </div>
                {cv.delai_max && (
                  <span className="flex-shrink-0 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                    Max {cv.delai_max}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DBC */}
      {poste.dbc && poste.dbc.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
            <Thermometer size={18} className="text-red-500" />
            Détecteurs de Boîte Chaude (DBC)
          </h2>
          <div className="space-y-2">
            {poste.dbc.map((item) => (
              <div
                key={item.designation}
                className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.designation}</p>
                  {item.voie && (
                    <p className="text-xs text-slate-600 mt-0.5">{item.voie}</p>
                  )}
                  {item.note && (
                    <p className="text-xs text-red-600 mt-1">{item.note}</p>
                  )}
                </div>
                <Thermometer size={16} className="flex-shrink-0 mt-0.5 text-red-400" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PN sensibles */}
      {poste.pn_sensibles.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            PN sensibles
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {poste.pn_sensibles.map((pn) => (
                <div key={pn.numero} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">PN {pn.numero}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{pn.contact}</p>
                      {pn.note && (
                        <p className="text-xs text-amber-600 mt-1">{pn.note}</p>
                      )}
                    </div>
                    {pn.telephone && (
                      <PhoneButton number={pn.telephone} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Particularités */}
      <section>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
          <AlertTriangle size={18} className="text-blue-700" />
          Particularités et vigilances
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {poste.particularites.map((item, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700 leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Procédures clés */}
      <section>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
          <BookOpen size={18} className="text-blue-700" />
          Procédures clés
        </h2>
        <div className="space-y-2">
          {poste.procedures_cles.map((proc) => (
            <div key={proc.titre} className="bg-white rounded-xl border border-slate-200 p-3.5">
              <p className="text-sm font-semibold text-slate-900">{proc.titre}</p>
              <p className="text-xs text-slate-600 mt-0.5">{proc.description}</p>
              {proc.reference && (
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                  {proc.reference}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* REX */}
      {poste.rex && poste.rex.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
            <Users size={18} className="text-red-600" />
            Retours d&apos;expérience (REX)
          </h2>
          <div className="bg-red-50 rounded-xl border border-red-200 divide-y divide-red-100">
            {poste.rex.map((item, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
                <p className="text-sm text-red-800 leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Documents téléchargeables */}
      {documents.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
            <FileText size={18} className="text-blue-700" />
            Documents
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={`/api/documents/${doc.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <FileText size={20} className="text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.originalName}</p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(doc.size)} · ajouté le {formatDocumentDate(doc.createdAt)}
                  </p>
                </div>
                <Download size={16} className="text-blue-600 flex-shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Liens utiles */}
      {liensUtiles.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
            <Link2 size={18} className="text-blue-700" />
            Liens utiles
          </h2>
          <LiensList liens={liensUtiles} />
        </section>
      )}

      {/* Lien(s) secteur */}
      {poste.secteur_slugs.length > 0 && (
        <div className="space-y-2">
          {poste.secteur_slugs.map((slug) => (
            <Link
              key={slug}
              href={`/secteurs/${slug}`}
              className="flex items-center justify-between bg-blue-50 rounded-xl border border-blue-200 px-4 py-3 hover:bg-blue-100 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-blue-800">Voir le secteur associé</p>
                <p className="text-xs text-blue-600 mt-0.5">Points d&apos;accès, procédures terrain</p>
              </div>
              <ChevronLeft size={18} className="text-blue-400 rotate-180" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
