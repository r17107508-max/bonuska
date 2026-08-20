import { CompanyUserRole } from "@prisma/client";
import { requireApiCompanyUser, ok, safeCompanySelect } from "@/lib/api";
import { getDb } from "@/lib/db";

function optionalCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

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
      city: body.city ? String(body.city) : undefined,
      address: body.address ? String(body.address) : undefined,
      latitude: optionalCoordinate(body.latitude),
      longitude: optionalCoordinate(body.longitude),
      themeColor: body.themeColor ? String(body.themeColor) : undefined,
      icon: body.icon ? String(body.icon) : undefined,
    },
    select: safeCompanySelect,
  });
  return ok({ company });
}
