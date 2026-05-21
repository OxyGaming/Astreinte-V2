export const dynamic = "force-dynamic";

import { getAllFiches } from "@/lib/db";
import FichesClient from "./FichesClient";

export default async function FichesPage() {
  const fiches = await getAllFiches();
  return <FichesClient fiches={fiches} />;
}
