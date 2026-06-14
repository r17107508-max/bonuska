import { findCustomerForGlobalScan, findMembershipForScan, findRewardClaimForScan } from "@/lib/loyalty";

export async function resolveCompanyScan(companyId: string, token: string) {
  const rewardClaim = token ? await findRewardClaimForScan(token) : null;

  if (rewardClaim) {
    return {
      status: rewardClaim.companyId === companyId ? "reward_claim_found" as const : "reward_claim_wrong_company" as const,
      rewardClaim,
    };
  }

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
