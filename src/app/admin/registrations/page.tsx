import { requireAdminSession } from "@/lib/admin-auth";
import { getAllUsers } from "@/lib/db";
import RegistrationsClient from "./RegistrationsClient";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  await requireAdminSession();
  const allUsers = await getAllUsers();

  const pending = allUsers.filter((u) => u.status === "pending");
  const approved = allUsers.filter((u) => u.status === "approved");
  const rejected = allUsers.filter((u) => u.status === "rejected");

  return <RegistrationsClient pending={pending} approved={approved} rejected={rejected} />;
}
