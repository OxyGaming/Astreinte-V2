import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PosteForm from "../PosteForm";
import PosteAnnuaireEditor from "./PosteAnnuaireEditor";
import PostePNSensiblesEditor from "./PostePNSensiblesEditor";
import PosteProceduresClesEditor from "./PosteProceduresClesEditor";
import PosteCircuitsVoieEditor from "./PosteCircuitsVoieEditor";
import { PosteDbcEditor, PosteRexEditor } from "./PosteDbcRexEditor";
import PosteParticularitesEditor from "./PosteParticularitesEditor";
import type { AnnuaireEntry, PNSensiblePoste, ProcedureCle, CircuitVoie, Dbc } from "@/lib/types";

interface Props { params: Promise<{ id: string }> }

function parseAnnuaire(raw: string): AnnuaireEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Accepte uniquement le format plat AnnuaireEntry (champ "nom" requis)
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).nom !== "string") return [];
    return parsed as AnnuaireEntry[];
  } catch {
    return [];
  }
}

function parseParticularites(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function parseDbc(raw: string | null): Dbc[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).designation !== "string") return [];
    return parsed as Dbc[];
  } catch {
    return [];
  }
}

function parseRex(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function parseCircuitsVoie(raw: string): CircuitVoie[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).designation !== "string") return [];
    return parsed as CircuitVoie[];
  } catch {
    return [];
  }
}

function parseProceduresCles(raw: string): ProcedureCle[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>;
      if (typeof first.titre !== "string" || typeof first.description !== "string") return [];
    }
    return parsed as ProcedureCle[];
  } catch {
    return [];
  }
}

function parsePNSensibles(raw: string): PNSensiblePoste[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>;
      if (typeof first.numero !== "string" || typeof first.contact !== "string") return [];
    }
    return parsed as PNSensiblePoste[];
  } catch {
    return [];
  }
}

export default async function EditPostePage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const [poste, secteurs] = await Promise.all([
    prisma.poste.findUnique({
      where: { id },
      include: {
        secteurs: { include: { secteur: { select: { id: true, slug: true, nom: true } } } },
      },
    }),
    prisma.secteur.findMany({ orderBy: { nom: "asc" }, select: { id: true, slug: true, nom: true } }),
  ]);

  if (!poste) notFound();

  const initialAnnuaire = parseAnnuaire(poste.annuaire);
  const initialCircuitsVoie = parseCircuitsVoie(poste.circuitsVoie);
  const initialProceduresCles = parseProceduresCles(poste.proceduresCles);
  const initialPNSensibles = parsePNSensibles(poste.pnSensibles);
  const initialParticularites = parseParticularites(poste.particularites);
  const initialDbc = parseDbc(poste.dbc);
  const initialRex = parseRex(poste.rex);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/postes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux postes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier : {poste.nom}</h1>
        <p className="text-gray-500 text-sm mt-1">Identifiant : {poste.id}</p>
      </div>

      <div className="max-w-3xl space-y-8">
        <PosteForm mode="edit" poste={poste} secteurs={secteurs} />
        <PosteParticularitesEditor posteId={poste.id} initialEntries={initialParticularites} />
        <PosteCircuitsVoieEditor posteId={poste.id} initialEntries={initialCircuitsVoie} />
        <PosteProceduresClesEditor posteId={poste.id} initialEntries={initialProceduresCles} />
        <PostePNSensiblesEditor posteId={poste.id} initialEntries={initialPNSensibles} />
        <PosteDbcEditor posteId={poste.id} initialEntries={initialDbc} />
        <PosteRexEditor posteId={poste.id} initialEntries={initialRex} />
        <PosteAnnuaireEditor posteId={poste.id} initialAnnuaire={initialAnnuaire} />
      </div>
    </div>
  );
}
