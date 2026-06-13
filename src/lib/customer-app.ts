import { CompanyStatus, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hasActiveAccess } from "@/lib/loyalty";

export type ClientMembership = Prisma.CustomerMembershipGetPayload<{
  include: { company: { include: { loyaltyProgram: true } } };
}>;

export function rewardGoal(membership: ClientMembership) {
  return membership.company.loyaltyProgram?.goalCount ?? 1;
}

export function rewardLeft(membership: ClientMembership) {
  if (membership.rewardAvailable) {
    return 0;
  }

  return Math.max(rewardGoal(membership) - membership.currentCount, 0);
}

export function pickNearestGift(memberships: ClientMembership[]) {
  return [...memberships]
    .filter((membership) => membership.company.loyaltyProgram)
    .sort((a, b) => {
      if (a.rewardAvailable && !b.rewardAvailable) return -1;
      if (!a.rewardAvailable && b.rewardAvailable) return 1;
      return rewardLeft(a) - rewardLeft(b);
    })[0] ?? null;
}

export async function getClientMemberships(userId: string) {
  return getDb().customerMembership.findMany({
    where: { userId },
    include: { company: { include: { loyaltyProgram: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getActivePartnerCompanies() {
  const companies = await getDb().company.findMany({
    where: {
      isBlocked: false,
      status: { in: [CompanyStatus.ACTIVE_TRIAL, CompanyStatus.ACTIVE_PAID] },
      loyaltyProgram: { isNot: null },
    },
    include: { loyaltyProgram: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  return companies.filter((company) => hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil));
}
