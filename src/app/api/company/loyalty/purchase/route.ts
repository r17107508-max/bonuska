import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { addPurchase, getSuspiciousLoyaltyReason, recordSuspiciousLoyaltyAttempt } from "@/lib/loyalty";
import { parseRublesToKopeks } from "@/lib/raffles";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const body = await request.json();
  const membershipId = String(body.membershipId ?? "");
  const purchaseAmountKopeks = parseRublesToKopeks(body.purchaseAmount ?? body.purchaseAmountRubles ?? "");
  try {
    const result = await addPurchase(access!.companyId, membershipId, access!.userId, purchaseAmountKopeks);
    return ok({ ok: true, ...result });
  } catch (err) {
    const suspiciousReason = getSuspiciousLoyaltyReason(err);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: access!.companyId,
        membershipId,
        cashierId: access!.userId,
        source: "api",
        operation: "purchase",
        reason: suspiciousReason,
      });
    }
    return apiError(err instanceof Error ? err.message : "Не удалось начислить покупку");
  }
}
