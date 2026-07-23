export const dynamic = "force-dynamic";

import { getAllFiches } from "@/lib/db";
import FichesClient from "./FichesClient";

export default async function FichesPage({
  searchParams,
}: {
  searchParams: Promise<{ linkRci?: string; linkCil?: string }>;
}) {
  const fiches = await getAllFiches();
  const { linkRci, linkCil } = await searchParams;

  // Mode « + Session » venu d'un RCI ou d'un Livret : on propage le rattachement
  // à la fiche choisie, où le démarrage de session le nouera.
  const linkContext = linkRci
    ? { query: `linkRci=${linkRci}`, label: "RCI" }
    : linkCil
      ? { query: `linkCil=${linkCil}`, label: "Livret CIL" }
      : null;

  return <FichesClient fiches={fiches} linkContext={linkContext} />;
}
