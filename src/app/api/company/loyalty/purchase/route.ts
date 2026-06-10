import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { addPurchase } from "@/lib/loyalty";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const body = await request.json();
  try {
    await addPurchase(access!.companyId, String(body.membershipId ?? ""), access!.userId);
    return ok();
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Не удалось начислить покупку");
  }
}
