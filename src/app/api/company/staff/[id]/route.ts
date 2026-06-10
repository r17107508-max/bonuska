import { CompanyUserRole } from "@prisma/client";
import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const current = await getDb().companyUser.findFirst({ where: { id, companyId: access!.companyId } });
  if (!current) return apiError("Сотрудник не найден", 404);
  const staff = await getDb().companyUser.update({
    where: { id },
    data: {
      role: body.role ? (String(body.role) as CompanyUserRole) : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });
  return ok({ staff });
}
