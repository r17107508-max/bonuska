import { findCustomerForGlobalScan, findMembershipForScan } from "@/lib/loyalty";

export async function resolveCompanyScan(companyId: string, token: string) {
  const membership = token ? await findMembershipForScan(companyId, token) : null;

  if (membership) {
    return { status: "membership_found" as const, membership };
  }

  const user = token ? await findCustomerForGlobalScan(companyId, token) : null;

  if (user) {
    return { status: "customer_found_no_membership" as const, user };
  }

  return { status: "not_found" as const };
}
