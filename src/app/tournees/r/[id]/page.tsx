export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireUserSession } from "@/lib/user-auth";
import { loadRealisation, realisationAccess } from "@/lib/tournee/server";
import { buildRealisationView } from "@/lib/tournee/realisation";
import RealisationClient from "./RealisationClient";

export default async function RealisationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserSession();
  const { id } = await params;
  const r = await loadRealisation(id);
  if (!r || !realisationAccess(user, r).canView) notFound();
  const view = await buildRealisationView(user, r);
  return <RealisationClient initial={view} />;
}
