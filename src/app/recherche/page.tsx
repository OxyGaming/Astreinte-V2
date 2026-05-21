export const dynamic = "force-dynamic";

import { getAllFiches, getAllContacts, getAllSecteurs, getAllMnemoniques } from "@/lib/db";
import SearchPageClient from "./SearchPageClient";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function RecherchePage({ searchParams }: Props) {
  const [{ q }, fiches, contacts, secteurs, mnemoniques] = await Promise.all([
    searchParams,
    getAllFiches(),
    getAllContacts(),
    getAllSecteurs(),
    getAllMnemoniques(),
  ]);

  return (
    <SearchPageClient
      initialQuery={q ?? ""}
      fiches={fiches}
      contacts={contacts}
      secteurs={secteurs}
      mnemoniques={mnemoniques}
    />
  );
}
