import { requireApiCompanyAdmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const company = await getDb().company.findUnique({
    where: { id: access!.companyId },
    include: { loyaltyProgram: true },
  });
  const nearRewardStart = Math.max((company?.loyaltyProgram?.goalCount ?? 6) - 1, 1);
  const [
    clientsTotal,
    newClients7,
    newClientsMonth,
    purchasesToday,
    purchasesWeek,
    purchasesMonth,
    rewardsGranted,
    repeatClients,
    rewardReadyClients,
    nearRewardClients,
    weekTransactions,
    topClients,
  ] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access!.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access!.companyId, createdAt: { gte: weekStart } } }),
    getDb().customerMembership.count({ where: { companyId: access!.companyId, createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "PURCHASE", createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "PURCHASE", createdAt: { gte: weekStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "PURCHASE", createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "REWARD_GRANTED", createdAt: { gte: monthStart } } }),
    getDb().customerMembership.count({ where: { companyId: access!.companyId, totalPurchases: { gt: 1 } } }),
    getDb().customerMembership.count({ where: { companyId: access!.companyId, rewardAvailable: true } }),
    getDb().customerMembership.count({ where: { companyId: access!.companyId, rewardAvailable: false, currentCount: { gte: nearRewardStart } } }),
    getDb().loyaltyTransaction.findMany({ where: { companyId: access!.companyId, createdAt: { gte: weekStart } }, select: { membershipId: true } }),
    getDb().customerMembership.findMany({ where: { companyId: access!.companyId }, include: { user: true }, orderBy: { totalPurchases: "desc" }, take: 10 }),
  ]);
  const activeClients7 = new Set(weekTransactions.map((transaction) => transaction.membershipId)).size;

  return ok({
    clientsTotal,
    newClients7,
    newClientsMonth,
    purchasesToday,
    purchasesWeek,
    purchasesMonth,
    rewardsGranted,
    repeatClients,
    rewardReadyClients,
    nearRewardClients,
    activeClients7,
    topClients,
  });
}
