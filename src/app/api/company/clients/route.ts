import { requireApiCompanyAdmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;
  const clients = await getDb().customerMembership.findMany({
    where: { companyId: access!.companyId },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return ok({
    clients,
    loyaltyLevels: [],
  });
}
