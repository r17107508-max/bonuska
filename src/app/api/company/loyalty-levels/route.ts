import { CompanyUserRole } from "@prisma/client";
import { apiError, ok, requireApiCompanyUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { ensureDefaultLoyaltyLevels, validateLoyaltyLevels } from "@/lib/loyalty-levels";

export async function GET() {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;

  const levels = await getDb().$transaction(async (tx) => ensureDefaultLoyaltyLevels(tx, access!.companyId));
  return ok({ levels });
}

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const minPurchases = Number(body.minPurchases);
    if (!name) {
      return apiError("Название уровня не должно быть пустым");
    }
    if (!Number.isInteger(minPurchases) || minPurchases < 0) {
      return apiError("Порог уровня должен быть целым числом от 0");
    }

    const created = await getDb().$transaction(async (tx) => {
      const level = await tx.loyaltyLevel.create({
        data: {
          companyId: access!.companyId,
          name,
          icon: String(body.icon ?? "").trim() || null,
          color: String(body.color ?? "").trim() || null,
          minPurchases,
          benefit: String(body.benefit ?? "").trim() || null,
          isActive: body.isActive !== false,
          sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        },
      });
      const levels = await tx.loyaltyLevel.findMany({ where: { companyId: access!.companyId } });
      validateLoyaltyLevels(levels);
      return level;
    });

    return ok({ level: created }, 201);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Не удалось создать уровень");
  }
}
