import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { addPurchase, isRepeatGuardError, recordSuspiciousPurchaseAttempt } from "@/lib/loyalty";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const body = await request.json();
  const membershipId = String(body.membershipId ?? "");
  try {
    await addPurchase(access!.companyId, membershipId, access!.userId);
    return ok();
  } catch (err) {
    if (isRepeatGuardError(err)) {
      await recordSuspiciousPurchaseAttempt({
        companyId: access!.companyId,
        membershipId,
        cashierId: access!.userId,
        source: "api",
      });
    }
    return apiError(err instanceof Error ? err.message : "Не удалось начислить покупку");
  }
}
