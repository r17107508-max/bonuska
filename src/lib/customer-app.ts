import { CompanyStatus, LoyaltyProgramType, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hasActiveAccess } from "@/lib/loyalty";

export type ClientMembership = Prisma.CustomerMembershipGetPayload<{
  include: { company: { include: { loyaltyProgram: true, giftOptions: true, loyaltyLevels: true } } };
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
    .filter((membership) => membership.company.loyaltyProgram?.programType !== LoyaltyProgramType.CUSTOMER_LEVELS)
    .sort((a, b) => {
      if (a.rewardAvailable && !b.rewardAvailable) return -1;
      if (!a.rewardAvailable && b.rewardAvailable) return 1;
      return rewardLeft(a) - rewardLeft(b);
    })[0] ?? null;
}

export async function getClientMemberships(userId: string) {
  return getDb().customerMembership.findMany({
    where: { userId, company: { status: { not: CompanyStatus.DELETED } } },
    include: { company: { include: { loyaltyProgram: true, giftOptions: true, loyaltyLevels: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getActivePartnerCompanies(city?: string | null) {
  const companies = await getDb().company.findMany({
    where: {
      isBlocked: false,
      status: { in: [CompanyStatus.ACTIVE_TRIAL, CompanyStatus.ACTIVE_PAID] },
      loyaltyProgram: { isNot: null },
      ...(city ? { city: { equals: city } } : {}),
    },
    include: { loyaltyProgram: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  return companies.filter((company) => hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil));
}

export async function getPartnerCities() {
  const companies = await getActivePartnerCompanies();
  return Array.from(new Set(companies.map((company) => company.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
}
