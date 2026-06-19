import { CompanyStatus, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hasActiveAccess } from "@/lib/loyalty";

export type ClientMembership = Prisma.CustomerMembershipGetPayload<{
  include: { company: { include: { loyaltyProgram: true, giftOptions: true } } };
}>;

export type ClientDashboardMembership = Prisma.CustomerMembershipGetPayload<{
  select: {
    id: true;
    currentCount: true;
    totalPurchases: true;
    rewardAvailable: true;
    company: {
      select: {
        id: true;
        name: true;
        loyaltyProgram: true;
        giftOptions: {
          where: { isActive: true };
          select: { isActive: true };
        };
      };
    };
  };
}>;

type RewardProgressMembership = Pick<ClientMembership, "currentCount" | "rewardAvailable"> & {
  company: {
    loyaltyProgram: Pick<NonNullable<ClientMembership["company"]["loyaltyProgram"]>, "goalCount"> | null;
  };
};

export function rewardGoal(membership: RewardProgressMembership) {
  return membership.company.loyaltyProgram?.goalCount ?? 1;
}

export function rewardLeft(membership: RewardProgressMembership) {
  if (membership.rewardAvailable) {
    return 0;
  }

  return Math.max(rewardGoal(membership) - membership.currentCount, 0);
}

export function pickNearestGift(memberships: (ClientMembership | ClientDashboardMembership)[]) {
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
    where: { userId, company: { status: { not: CompanyStatus.DELETED } } },
    include: { company: { include: { loyaltyProgram: true, giftOptions: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getClientDashboardMemberships(userId: string) {
  return getDb().customerMembership.findMany({
    where: { userId, company: { status: { not: CompanyStatus.DELETED } } },
    select: {
      id: true,
      currentCount: true,
      totalPurchases: true,
      rewardAvailable: true,
      company: {
        select: {
          id: true,
          name: true,
          loyaltyProgram: true,
          giftOptions: {
            where: { isActive: true },
            select: { isActive: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
}

export async function getActivePartnerCompanies(city?: string | null, take?: number) {
  const companies = await getDb().company.findMany({
    where: {
      isBlocked: false,
      status: { in: [CompanyStatus.ACTIVE_TRIAL, CompanyStatus.ACTIVE_PAID] },
      loyaltyProgram: { isNot: null },
      ...(city ? { city: { equals: city } } : {}),
    },
    include: { loyaltyProgram: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    ...(take ? { take } : {}),
  });

  return companies.filter((company) => hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil));
}

export async function getPartnerCities() {
  const companies = await getActivePartnerCompanies();
  return Array.from(new Set(companies.map((company) => company.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
}
