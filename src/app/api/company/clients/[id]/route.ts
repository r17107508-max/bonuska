import { requireApiCompanyAdmin, apiError, ok, safeCompanySelect, safeUserSelect } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;
  const { id } = await params;
  const client = await getDb().customerMembership.findFirst({
    where: { id, companyId: access!.companyId },
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
      company: { select: { ...safeCompanySelect, loyaltyProgram: true } },
      transactions: {
        select: {
          id: true,
          companyId: true,
          membershipId: true,
          cashierId: true,
          type: true,
          quantity: true,
          countBefore: true,
          countAfter: true,
          rewardTitle: true,
          createdAt: true,
          cashier: { select: safeUserSelect },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) return apiError("Клиент не найден", 404);
  return ok({
    client,
    loyaltyLevel: null,
  });
}
