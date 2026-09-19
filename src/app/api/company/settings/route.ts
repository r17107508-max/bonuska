import { CompanyUserRole } from "@prisma/client";
import { apiError, requireApiCompanyUser, ok, safeCompanySelect } from "@/lib/api";
import { normalizeCardFontFamily } from "@/lib/company-appearance";
import { cleanHexColor, normalizeCompanyImageUrl } from "@/lib/company-design";
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
  let logoUrl: string | null | undefined;
  let cardBackgroundUrl: string | null | undefined;
  try {
    logoUrl = body.logoUrl === undefined ? undefined : normalizeCompanyImageUrl(body.logoUrl);
    cardBackgroundUrl = body.cardBackgroundUrl === undefined ? undefined : normalizeCompanyImageUrl(body.cardBackgroundUrl);
  } catch (urlError) {
    return apiError(urlError instanceof Error ? urlError.message : "Некорректная ссылка на изображение");
  }
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
      logoUrl,
      cardBackgroundUrl,
      cardBackgroundMode: body.cardBackgroundMode === "PHOTO" ? "PHOTO" : body.cardBackgroundMode === "SOLID" ? "SOLID" : undefined,
      cardSurfaceColor: body.cardSurfaceColor === undefined ? undefined : cleanHexColor(body.cardSurfaceColor, "#FFFFFF"),
      cardTextColor: body.cardTextColor === undefined ? undefined : cleanHexColor(body.cardTextColor, "#1F1B18"),
      cardFontFamily: body.cardFontFamily === undefined ? undefined : normalizeCardFontFamily(String(body.cardFontFamily)),
    },
    select: safeCompanySelect,
  });
  return ok({ company });
}
