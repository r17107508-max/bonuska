import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import { apiError, ok, publicCompanySelect, requireApiUser } from "@/lib/api";
import { buildRewardQrPayload, isGiftBoxProgram } from "@/lib/loyalty";
import { CompanyStatus, RewardClaimStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const { membershipId } = await params;
  const card = await getDb().customerMembership.findFirst({
    where: { id: membershipId, userId: user!.id, company: { status: { not: CompanyStatus.DELETED } } },
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
          cashier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!card) {
    return apiError("Карта не найдена", 404);
  }

  const isGiftBox = card.company.loyaltyProgram ? isGiftBoxProgram(card.company.loyaltyProgram, card.company.giftOptions) : false;
  const activeRewardClaim = card.rewardAvailable && isGiftBox
    ? await getDb().rewardClaim.findFirst({
        where: {
          membershipId: card.id,
          status: { in: [RewardClaimStatus.OPENED, RewardClaimStatus.AVAILABLE] },
        },
        orderBy: [{ openedAt: "desc" }, { createdAt: "asc" }],
      })
    : null;
  const rewardClaim = activeRewardClaim?.status === RewardClaimStatus.OPENED
    ? {
        id: activeRewardClaim.id,
        status: activeRewardClaim.status,
        title: activeRewardClaim.title,
        description: activeRewardClaim.description,
        openedAt: activeRewardClaim.openedAt,
        rewardQrToken: activeRewardClaim.token,
        qrPayload: buildRewardQrPayload(activeRewardClaim.token),
        qrDataUrl: await QRCode.toDataURL(buildRewardQrPayload(activeRewardClaim.token), {
          margin: 1,
          width: 360,
          color: { dark: "#92400e", light: "#ffffff" },
        }),
      }
    : null;

  return ok({
    card,
    rewardClaim,
    loyaltyLevel: null,
  });
}
