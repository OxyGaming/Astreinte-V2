export const dynamic = "force-dynamic";

import { getAllPostes } from "@/lib/db";
import PostesClient from "./PostesClient";

export default async function PostesPage() {
  const postes = await getAllPostes();
  return <PostesClient postes={postes} />;
}
