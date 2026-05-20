export const dynamic = "force-dynamic";

import { getLiensHub } from "@/lib/db";
import LiensHubClient from "./LiensHubClient";

export default async function LiensUtilesPage() {
  const { categories, autres } = await getLiensHub();
  return <LiensHubClient categories={categories} autres={autres} />;
}
