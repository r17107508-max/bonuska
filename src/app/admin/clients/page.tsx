import { redirect } from "next/navigation";

export default function LegacyAdminClientsPage() {
  redirect("/company/clients");
}
