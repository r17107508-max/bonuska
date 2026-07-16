import { CompanyStatus } from "@prisma/client";
import { getDb } from "@/lib/db";

export const LOW_RATING_THRESHOLD = 2;
export const LOW_RATING_GRACE_DAYS = 14;

export type CompanyRatingSummary = {
  companyId: string;
  ratingAverage: number | null;
  reviewCount: number;
};

export async function getCompanyRatingSummaries(companyIds: string[]) {
  if (companyIds.length === 0) {
    return new Map<string, CompanyRatingSummary>();
  }

  const grouped = await getDb().companyReview.groupBy({
    by: ["companyId"],
    where: { companyId: { in: companyIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    grouped.map((item) => [
      item.companyId,
      {
        companyId: item.companyId,
        ratingAverage: item._avg.rating ? Number(item._avg.rating.toFixed(1)) : null,
        reviewCount: item._count.rating,
      },
    ]),
  );
}

export async function getCompanyRatingSummary(companyId: string) {
  const result = await getDb().companyReview.aggregate({
    where: { companyId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    companyId,
    ratingAverage: result._avg.rating ? Number(result._avg.rating.toFixed(1)) : null,
    reviewCount: result._count.rating,
  };
}

export async function enforceCompanyRatingStatus(companyId: string, now = new Date()) {
  const db = getDb();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      status: true,
      isBlocked: true,
      ratingLowSince: true,
    },
  });

  if (!company || company.status === CompanyStatus.DELETED || company.status === CompanyStatus.REJECTED) {
    return;
  }

  const summary = await getCompanyRatingSummary(companyId);
  const hasLowRating = summary.reviewCount > 0 && (summary.ratingAverage ?? 5) <= LOW_RATING_THRESHOLD;

  if (!hasLowRating) {
    if (!company.isBlocked && company.ratingLowSince) {
      await db.company.update({
        where: { id: companyId },
        data: { ratingLowSince: null, ratingBlockedAt: null },
      });
    }
    return;
  }

  if (!company.ratingLowSince) {
    await db.company.update({
      where: { id: companyId },
      data: { ratingLowSince: now },
    });
    return;
  }

  const graceMs = LOW_RATING_GRACE_DAYS * 24 * 60 * 60 * 1000;
  if (now.getTime() - company.ratingLowSince.getTime() < graceMs || company.isBlocked) {
    return;
  }

  await db.company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.BLOCKED,
      isBlocked: true,
      ratingBlockedAt: now,
      auditLogs: {
        create: {
          action: "COMPANY_BLOCKED_BY_LOW_RATING",
          entityType: "Company",
          entityId: companyId,
          metadataJson: JSON.stringify(summary),
        },
      },
    },
  });
}

export async function enforceCompaniesRatingStatus(companyIds: string[]) {
  await Promise.all(companyIds.map((companyId) => enforceCompanyRatingStatus(companyId)));
}
