import { NextResponse } from "next/server";
import { CompanyStatus, CompanyUserRole, GlobalRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export function ok(data: unknown = { ok: true }, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const safeUserSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  city: true,
  globalRole: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const safeCompanySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  businessType: true,
  icon: true,
  themeColor: true,
  city: true,
  address: true,
  website: true,
  logoUrl: true,
  cardBackgroundUrl: true,
  cardBackgroundMode: true,
  cardSurfaceColor: true,
  cardTextColor: true,
  latitude: true,
  longitude: true,
  ownerName: true,
  ownerPhone: true,
  ownerEmail: true,
  inn: true,
  comment: true,
  status: true,
  deletedAt: true,
  onboardingChecklistHidden: true,
  trialStartedAt: true,
  trialEndsAt: true,
  paidUntil: true,
  lastPaidAt: true,
  isBlocked: true,
  ratingLowSince: true,
  ratingBlockedAt: true,
  posApiKeyPrefix: true,
  posApiKeyCreatedAt: true,
  posApiKeyLastUsedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const publicCompanySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  businessType: true,
  icon: true,
  themeColor: true,
  city: true,
  address: true,
  website: true,
  logoUrl: true,
  cardBackgroundUrl: true,
  cardBackgroundMode: true,
  cardSurfaceColor: true,
  cardTextColor: true,
  latitude: true,
  longitude: true,
  ownerPhone: true,
  status: true,
  trialEndsAt: true,
  paidUntil: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function requireApiSuperadmin() {
  const user = await getCurrentUser();
  if (!user || user.globalRole !== GlobalRole.SUPERADMIN) {
    return { error: apiError("Недостаточно прав", 403), user: null };
  }
  return { error: null, user };
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: apiError("Требуется вход", 401), user: null };
  }

  return { error: null, user };
}

export async function requireApiCompanyUser(roles?: CompanyUserRole[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: apiError("Требуется вход", 401), access: null };
  }

  const access = await getDb().companyUser.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      company: { status: { not: CompanyStatus.DELETED } },
      ...(roles ? { role: { in: roles } } : {}),
    },
    select: {
      id: true,
      companyId: true,
      userId: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      company: { select: safeCompanySelect },
      user: { select: safeUserSelect },
    },
  });

  if (!access) {
    return { error: apiError("Нет доступа к компании", 403), access: null };
  }

  return { error: null, access };
}

export function requireApiCompanyAdmin() {
  return requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
}
