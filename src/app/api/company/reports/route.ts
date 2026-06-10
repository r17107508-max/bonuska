import { requireApiCompanyUser, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [purchasesToday, purchasesMonth, rewardsGranted, activeClients, topClients] = await Promise.all([
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "PURCHASE", createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "PURCHASE", createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access!.companyId, type: "REWARD_GRANTED" } }),
    getDb().customerMembership.count({ where: { companyId: access!.companyId, totalPurchases: { gt: 0 } } }),
    getDb().customerMembership.findMany({ where: { companyId: access!.companyId }, include: { user: true }, orderBy: { totalPurchases: "desc" }, take: 10 }),
  ]);
  return ok({ purchasesToday, purchasesMonth, rewardsGranted, activeClients, topClients });
}
