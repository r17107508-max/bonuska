import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ok } from "@/lib/api";
import { calculateLoyaltyLevel } from "@/lib/loyalty-levels";
import { CompanyStatus, LoyaltyProgramType } from "@prisma/client";

export async function GET() {
  const user = await requireUser();
  const cards = await getDb().customerMembership.findMany({
    where: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    include: { company: { include: { loyaltyProgram: true, giftOptions: true, loyaltyLevels: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return ok({
    cards,
    loyaltyLevels: cards.map((card) => ({
      membershipId: card.id,
      progress: card.company.loyaltyProgram?.programType === LoyaltyProgramType.CUSTOMER_LEVELS
        ? calculateLoyaltyLevel(card.totalPurchases, card.company.loyaltyLevels)
        : null,
    })),
  });
}
