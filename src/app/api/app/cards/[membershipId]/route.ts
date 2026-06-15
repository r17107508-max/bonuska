import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, ok } from "@/lib/api";
import { buildRewardQrPayload } from "@/lib/loyalty";
import { CompanyStatus, RewardClaimStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const user = await requireUser();
  const { membershipId } = await params;
  const card = await getDb().customerMembership.findFirst({
    where: { id: membershipId, userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    include: {
      company: { include: { loyaltyProgram: true } },
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!card) {
    return apiError("Карта не найдена", 404);
  }

  const activeRewardClaim = card.rewardAvailable
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
        qrPayload: buildRewardQrPayload(activeRewardClaim.token),
        qrDataUrl: await QRCode.toDataURL(buildRewardQrPayload(activeRewardClaim.token), {
          margin: 1,
          width: 360,
          color: { dark: "#92400e", light: "#ffffff" },
        }),
      }
    : null;

  return ok({ card, rewardClaim });
}
