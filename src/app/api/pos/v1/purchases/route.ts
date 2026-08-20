import { apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { addPurchase, findMembershipForScan, getSuspiciousLoyaltyReason, recordSuspiciousLoyaltyAttempt } from "@/lib/loyalty";
import { parseRublesToKopeks } from "@/lib/raffles";
import { choosePosCashier, findCompanyByPosApiKey, readBearerToken } from "@/lib/pos";

type PosPurchaseBody = {
  qr?: string;
  receiptId?: string;
  idempotencyKey?: string;
  quantity?: number;
  purchaseAmount?: string | number;
  purchaseAmountRubles?: string | number;
  cashierPhone?: string;
};

export async function POST(request: Request) {
  const apiKey = readBearerToken(request);
  const company = await findCompanyByPosApiKey(apiKey);
  if (!company) {
    return apiError("Некорректный POS API-ключ или компания недоступна", 401);
  }

  const body = (await request.json().catch(() => null)) as PosPurchaseBody | null;
  if (!body) {
    return apiError("Некорректный JSON");
  }

  const qr = String(body.qr ?? "").trim();
  const receiptId = String(body.receiptId ?? "").trim();
  const idempotencyKey = String(body.idempotencyKey ?? receiptId).trim();
  const quantity = Number(body.quantity ?? 1);
  const purchaseAmountKopeks = parseRublesToKopeks(String(body.purchaseAmount ?? body.purchaseAmountRubles ?? ""));

  if (!qr) {
    return apiError("Передайте QR клиента в поле qr");
  }

  if (!idempotencyKey) {
    return apiError("Передайте receiptId или idempotencyKey для защиты от повторного начисления");
  }

  const existing = await getDb().posOperation.findUnique({
    where: { companyId_idempotencyKey: { companyId: company.id, idempotencyKey } },
  });
  if (existing?.responseJson) {
    return ok({ ok: true, duplicate: true, ...JSON.parse(existing.responseJson) });
  }
  if (existing) {
    return apiError("Операция с таким idempotencyKey уже обрабатывалась", 409);
  }

  const cashier = choosePosCashier(company, body.cashierPhone ? String(body.cashierPhone) : undefined);
  if (!cashier) {
    return apiError("В компании нет активного сотрудника для записи POS-операции", 403);
  }

  const membership = await findMembershipForScan(company.id, qr);
  if (!membership) {
    return apiError("Клиент по QR не найден", 404);
  }

  await getDb().posOperation.create({
    data: {
      companyId: company.id,
      idempotencyKey,
      type: "PURCHASE",
      receiptId: receiptId || null,
      membershipId: membership.id,
    },
  });

  try {
    const result = await addPurchase(company.id, membership.id, cashier.id, quantity, purchaseAmountKopeks);
    const response = {
      membershipId: membership.id,
      customerName: membership.user.name,
      quantity,
      result,
    };

    await getDb().posOperation.update({
      where: { companyId_idempotencyKey: { companyId: company.id, idempotencyKey } },
      data: { responseJson: JSON.stringify(response) },
    });

    return ok({ ok: true, duplicate: false, ...response });
  } catch (error) {
    const suspiciousReason = getSuspiciousLoyaltyReason(error);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: company.id,
        membershipId: membership.id,
        cashierId: cashier.id,
        source: "pos-api",
        operation: "purchase",
        reason: suspiciousReason,
      });
    }

    await getDb().posOperation.delete({
      where: { companyId_idempotencyKey: { companyId: company.id, idempotencyKey } },
    }).catch(() => undefined);

    return apiError(error instanceof Error ? error.message : "Не удалось начислить покупку");
  }
}
