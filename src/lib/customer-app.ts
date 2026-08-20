import { CompanyStatus, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { publicCompanySelect } from "@/lib/api";
import { enforceCompaniesRatingStatus, getCompanyRatingSummaries } from "@/lib/company-reviews";
import { hasActiveAccess } from "@/lib/loyalty";

const clientMembershipSelect = {
  id: true,
  companyId: true,
  userId: true,
  currentCount: true,
  totalPurchases: true,
  totalRewards: true,
  levelId: true,
  currentLevelName: true,
  levelReachedAt: true,
  rewardAvailable: true,
  pendingReward: true,
  lastActionAt: true,
  createdAt: true,
  updatedAt: true,
  company: { select: { ...publicCompanySelect, loyaltyProgram: true, giftOptions: true } },
} as const;

export type ClientMembership = Prisma.CustomerMembershipGetPayload<{
  select: typeof clientMembershipSelect;
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
    select: clientMembershipSelect,
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

export async function getActivePartnerCompanies(city?: string | null, take?: number, businessType?: string | null) {
  const where = {
    isBlocked: false,
    status: { in: [CompanyStatus.ACTIVE_TRIAL, CompanyStatus.ACTIVE_PAID] },
    loyaltyProgram: { isNot: null },
    ...(city ? { city: { equals: city } } : {}),
    ...(businessType ? { businessType: { equals: businessType } } : {}),
  } satisfies Prisma.CompanyWhereInput;

  const candidates = await getDb().company.findMany({
    where,
    select: { id: true },
    ...(take ? { take } : {}),
  });
  await enforceCompaniesRatingStatus(candidates.map((company) => company.id));

  const companies = await getDb().company.findMany({
    where: {
      ...where,
    },
    select: { ...publicCompanySelect, loyaltyProgram: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    ...(take ? { take } : {}),
  });
  const summaries = await getCompanyRatingSummaries(companies.map((company) => company.id));

  return companies
    .filter((company) => hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil))
    .map((company) => {
      const summary = summaries.get(company.id);
      return {
        ...company,
        ratingAverage: summary?.ratingAverage ?? null,
        reviewCount: summary?.reviewCount ?? 0,
      };
    });
}

export async function getPartnerCities() {
  const companies = await getActivePartnerCompanies();
  return Array.from(new Set(companies.map((company) => company.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
}

export async function getPartnerCategories(city?: string | null) {
  const companies = await getActivePartnerCompanies(city || null);
  return Array.from(new Set(companies.map((company) => company.businessType).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
}
