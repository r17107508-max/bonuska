import { getDb } from "@/lib/db";
import { apiError, ok, publicCompanySelect, requireApiUser } from "@/lib/api";
import { ensureGlobalQrToken, joinCompanyProgram } from "@/lib/loyalty";
import { CompanyStatus } from "@prisma/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const { slug } = await params;
  const company = await getDb().company.findUnique({
    where: { slug },
    include: { loyaltyProgram: true },
  });

  if (!company || company.status === CompanyStatus.DELETED || company.isBlocked || !company.loyaltyProgram) {
    return apiError("Компания не найдена", 404);
  }

  await ensureGlobalQrToken(user!);
  let membershipId: string;
  try {
    const membership = await joinCompanyProgram(company.id, user!.id);
    membershipId = membership.id;
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Компания сейчас недоступна", 403);
  }

  const membership = await getDb().customerMembership.findFirstOrThrow({
    where: { id: membershipId, userId: user!.id },
    select: {
      id: true,
      companyId: true,
      userId: true,
      currentCount: true,
      totalPurchases: true,
      totalRewards: true,
      rewardAvailable: true,
      pendingReward: true,
      lastActionAt: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { ...publicCompanySelect, loyaltyProgram: true } },
    },
  });

  return ok({ membership });
}
