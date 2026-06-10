import { redirect } from "next/navigation";

export default function LegacyAdminScanPage() {
  redirect("/company/scan");
}
