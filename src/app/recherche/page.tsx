import { getAllFiches, getAllContacts, getAllSecteurs, getAllMnemoniques } from "@/lib/db";
import SearchPageClient from "./SearchPageClient";

export default async function RecherchePage() {
  const [fiches, contacts, secteurs, mnemoniques] = await Promise.all([
    getAllFiches(),
    getAllContacts(),
    getAllSecteurs(),
    getAllMnemoniques(),
  ]);

  return (
    <SearchPageClient
      fiches={fiches}
      contacts={contacts}
      secteurs={secteurs}
      mnemoniques={mnemoniques}
    />
  );
}
