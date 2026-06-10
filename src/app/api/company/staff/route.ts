import bcrypt from "bcryptjs";
import { CompanyUserRole } from "@prisma/client";
import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { normalizePhone } from "@/lib/format";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;
  const body = await request.json();
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  if (!name || phone.length < 10 || password.length < 6) return apiError("Заполните данные сотрудника");
  const user = await getDb().user.upsert({
    where: { phone },
    update: { name, passwordHash: await bcrypt.hash(password, 10) },
    create: { name, phone, passwordHash: await bcrypt.hash(password, 10) },
  });
  const staff = await getDb().companyUser.upsert({
    where: { companyId_userId: { companyId: access!.companyId, userId: user.id } },
    update: { role: String(body.role ?? "CASHIER") as CompanyUserRole, isActive: body.isActive !== false },
    create: { companyId: access!.companyId, userId: user.id, role: String(body.role ?? "CASHIER") as CompanyUserRole, isActive: body.isActive !== false },
  });
  return ok({ staff }, 201);
}
