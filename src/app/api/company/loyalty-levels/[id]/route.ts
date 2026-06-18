import { CompanyUserRole } from "@prisma/client";
import { apiError, ok, requireApiCompanyUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { validateLoyaltyLevels } from "@/lib/loyalty-levels";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const level = await getDb().loyaltyLevel.findFirst({ where: { id, companyId: access!.companyId } });
  if (!level) {
    return apiError("Уровень не найден", 404);
  }

  try {
    const name = body.name === undefined ? undefined : String(body.name).trim();
    const minPurchases = body.minPurchases === undefined ? undefined : Number(body.minPurchases);
    if (name !== undefined && !name) {
      return apiError("Название уровня не должно быть пустым");
    }
    if (minPurchases !== undefined && (!Number.isInteger(minPurchases) || minPurchases < 0)) {
      return apiError("Порог уровня должен быть целым числом от 0");
    }

    const updated = await getDb().$transaction(async (tx) => {
      const next = await tx.loyaltyLevel.update({
        where: { id },
        data: {
          name,
          minPurchases,
          benefit: body.benefit === undefined ? undefined : String(body.benefit).trim() || null,
          icon: body.icon === undefined ? undefined : String(body.icon).trim() || null,
          color: body.color === undefined ? undefined : String(body.color).trim() || null,
          isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
          sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
        },
      });
      const levels = await tx.loyaltyLevel.findMany({ where: { companyId: access!.companyId } });
      validateLoyaltyLevels(levels);
      return next;
    });

    return ok({ level: updated });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Не удалось обновить уровень");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;

  const { id } = await params;
  const level = await getDb().loyaltyLevel.findFirst({ where: { id, companyId: access!.companyId } });
  if (!level) {
    return apiError("Уровень не найден", 404);
  }

  try {
    await getDb().$transaction(async (tx) => {
      await tx.loyaltyLevel.delete({ where: { id } });
      const levels = await tx.loyaltyLevel.findMany({ where: { companyId: access!.companyId } });
      validateLoyaltyLevels(levels);
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Не удалось удалить уровень");
  }

  return ok({ ok: true });
}
