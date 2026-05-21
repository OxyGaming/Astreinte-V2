import { getAllContacts } from "@/lib/db";
import ContactsClient from "./ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await getAllContacts();
  return <ContactsClient contacts={contacts} />;
}
