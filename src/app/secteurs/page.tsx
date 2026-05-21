export const dynamic = "force-dynamic";

import { getAllSecteurs } from "@/lib/db";
import SecteursClient from "./SecteursClient";

export default async function SecteursPage() {
  const secteurs = await getAllSecteurs();
  return <SecteursClient secteurs={secteurs} />;
}
