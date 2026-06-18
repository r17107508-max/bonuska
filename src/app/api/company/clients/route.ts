import { requireApiCompanyAdmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { calculateLoyaltyLevel } from "@/lib/loyalty-levels";

export async function GET() {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;
  const clients = await getDb().customerMembership.findMany({
    where: { companyId: access!.companyId },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });
  const levels = await getDb().loyaltyLevel.findMany({
    where: { companyId: access!.companyId, isActive: true },
    orderBy: [{ minPurchases: "asc" }, { sortOrder: "asc" }],
  });

  return ok({
    clients,
    loyaltyLevels: clients.map((client) => ({
      membershipId: client.id,
      progress: calculateLoyaltyLevel(client.totalPurchases, levels),
    })),
  });
}
