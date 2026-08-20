import { getDb } from "@/lib/db";
import { ok, publicCompanySelect, requireApiUser } from "@/lib/api";
import { CompanyStatus } from "@prisma/client";

export async function GET() {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const cards = await getDb().customerMembership.findMany({
    where: { userId: user!.id, company: { status: { not: CompanyStatus.DELETED } } },
    select: {
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
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return ok({
    cards,
    loyaltyLevels: [],
  });
}
