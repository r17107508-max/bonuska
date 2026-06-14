import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { apiError, ok } from "@/lib/api";
import { buildRewardQrPayload, openRewardClaimForCustomer } from "@/lib/loyalty";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("Требуется вход", 401);
  }

  const body = await request.json().catch(() => ({}));
  const membershipId = String(body.membershipId ?? "");

  if (!membershipId) {
    return apiError("Карта не найдена", 400);
  }

  try {
    const claim = await openRewardClaimForCustomer(user.id, membershipId);
    const qrPayload = buildRewardQrPayload(claim.token);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 360,
      color: {
        dark: "#92400e",
        light: "#ffffff",
      },
    });

    return ok({
      rewardClaim: {
        id: claim.id,
        status: claim.status,
        title: claim.title,
        description: claim.description,
        openedAt: claim.openedAt,
        token: claim.token,
        qrPayload,
        qrDataUrl,
      },
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось открыть подарок");
  }
}
