import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { getSuspiciousLoyaltyReason, grantReward, recordSuspiciousLoyaltyAttempt } from "@/lib/loyalty";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const body = await request.json();
  const membershipId = String(body.membershipId ?? "");
  try {
    await grantReward(access!.companyId, membershipId, access!.userId);
    return ok();
  } catch (err) {
    const suspiciousReason = getSuspiciousLoyaltyReason(err);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: access!.companyId,
        membershipId,
        cashierId: access!.userId,
        source: "api",
        operation: "reward",
        reason: suspiciousReason,
      });
    }
    return apiError(err instanceof Error ? err.message : "Не удалось выдать подарок");
  }
}
