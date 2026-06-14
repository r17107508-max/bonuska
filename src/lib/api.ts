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

export async function requireApiSuperadmin() {
  const user = await getCurrentUser();
  if (!user || user.globalRole !== GlobalRole.SUPERADMIN) {
    return { error: apiError("Недостаточно прав", 403), user: null };
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
    include: { company: true, user: true },
  });

  if (!access) {
    return { error: apiError("Нет доступа к компании", 403), access: null };
  }

  return { error: null, access };
}

export function requireApiCompanyAdmin() {
  return requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
}
