import { redirect } from "next/navigation";
import { requireCustomerMembership } from "@/lib/auth";

export default async function LegacyCompanyClientAppPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const membership = await requireCustomerMembership(companySlug);
  redirect(`/app/cards/${membership.id}`);
}
