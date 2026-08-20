import { requireApiCompanyAdmin, ok, safeUserSelect } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;
  const clients = await getDb().customerMembership.findMany({
    where: { companyId: access!.companyId },
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
      user: { select: safeUserSelect },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return ok({
    clients,
    loyaltyLevels: [],
  });
}
