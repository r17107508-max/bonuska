import { getDb } from "@/lib/db";
import { ok, publicCompanySelect, requireApiUser } from "@/lib/api";
import { CompanyStatus } from "@prisma/client";

export async function GET() {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const history = await getDb().loyaltyTransaction.findMany({
    where: { membership: { userId: user!.id, company: { status: { not: CompanyStatus.DELETED } } } },
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
      company: { select: publicCompanySelect },
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({ history });
}
