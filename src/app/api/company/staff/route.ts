import { CompanyUserRole } from "@prisma/client";
import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { PHONE_ALREADY_REGISTERED_MESSAGE, normalizePhone } from "@/lib/format";
import { ensureGlobalQrToken } from "@/lib/loyalty";
import { createUserWithUniquePhone, isPhoneAlreadyRegisteredError } from "@/lib/users";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;
  const body = await request.json();
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  if (!name || phone.length < 10 || password.length < 6) return apiError("Заполните данные сотрудника");
  let user: Awaited<ReturnType<typeof createUserWithUniquePhone>>;
  try {
    user = await createUserWithUniquePhone({ name, phone, city: access!.company.city, password });
  } catch (error) {
    if (isPhoneAlreadyRegisteredError(error)) {
      return apiError(PHONE_ALREADY_REGISTERED_MESSAGE, 409);
    }

    throw error;
  }
  await ensureGlobalQrToken(user);
  const staff = await getDb().companyUser.upsert({
    where: { companyId_userId: { companyId: access!.companyId, userId: user.id } },
    update: { role: String(body.role ?? "CASHIER") as CompanyUserRole, isActive: body.isActive !== false },
    create: { companyId: access!.companyId, userId: user.id, role: String(body.role ?? "CASHIER") as CompanyUserRole, isActive: body.isActive !== false },
  });
  return ok({ staff }, 201);
}
