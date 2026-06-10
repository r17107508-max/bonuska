import { CompanyUserRole } from "@prisma/client";
import { requireApiCompanyUser, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function PATCH(request: Request) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;
  const body = await request.json();
  const company = await getDb().company.update({
    where: { id: access!.companyId },
    data: {
      name: body.name ? String(body.name) : undefined,
      description: body.description ? String(body.description) : undefined,
      businessType: body.businessType ? String(body.businessType) : undefined,
      address: body.address ? String(body.address) : undefined,
      themeColor: body.themeColor ? String(body.themeColor) : undefined,
      icon: body.icon ? String(body.icon) : undefined,
    },
  });
  return ok({ company });
}
