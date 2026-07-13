import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import {
  addPurchase,
  findCustomerForGlobalScan,
  getSuspiciousLoyaltyReason,
  joinCompanyProgram,
  recordSuspiciousLoyaltyAttempt,
} from "@/lib/loyalty";
import { parseRublesToKopeks } from "@/lib/raffles";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;

  const body = await request.json();
  const token = String(body.token ?? "");
  const purchaseAmountKopeks = parseRublesToKopeks(body.purchaseAmount ?? body.purchaseAmountRubles ?? "");
  let membershipId = "";

  try {
    const customer = await findCustomerForGlobalScan(access!.companyId, token);
    if (!customer) {
      return apiError("Клиент не найден или уже подключён к программе вашей компании", 404);
    }
    if (customer.id === access!.userId) {
      return apiError("Кассир не может начислять покупки самому себе");
    }

    const membership = await joinCompanyProgram(access!.companyId, customer.id, access!.userId);
    membershipId = membership.id;
    const result = await addPurchase(access!.companyId, membership.id, access!.userId, purchaseAmountKopeks);

    return ok({ membershipId: membership.id, ...result });
  } catch (err) {
    const suspiciousReason = getSuspiciousLoyaltyReason(err);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: access!.companyId,
        membershipId,
        cashierId: access!.userId,
        token,
        source: "api",
        operation: "purchase",
        reason: suspiciousReason,
      });
    }

    return apiError(err instanceof Error ? err.message : "Не удалось подключить клиента и начислить покупку");
  }
}
