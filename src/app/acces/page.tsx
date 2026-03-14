import { getAllAccesRail, getDistinctLignesAcces } from "@/lib/db";
import AccesClient from "./AccesClient";

export default async function AccesPage() {
  const [points, lignes] = await Promise.all([
    getAllAccesRail(),
    getDistinctLignesAcces(),
  ]);

  return <AccesClient points={points} lignes={lignes} />;
}
