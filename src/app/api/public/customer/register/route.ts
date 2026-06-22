import { NextRequest } from "next/server";
import { CompanyStatus } from "@prisma/client";
import { createSession } from "@/lib/auth";
import { apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { PHONE_ALREADY_REGISTERED_MESSAGE, normalizePhone } from "@/lib/format";
import { ensureGlobalQrToken, joinCompanyProgram } from "@/lib/loyalty";
import { getSettings } from "@/lib/settings";
import { createUserWithUniquePhone, isPhoneAlreadyRegisteredError } from "@/lib/users";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const slug = String(body.companySlug ?? body.slug ?? "");
  const company = await getDb().company.findUnique({ where: { slug } });
  if (!company || company.status === CompanyStatus.DELETED || company.isBlocked) {
    return apiError("Компания не найдена", 404);
  }

  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  const city = String(body.city ?? company.city ?? "").trim();
  if (!name || phone.length < 10 || password.length < 6 || !city || !body.privacyAccepted) {
    return apiError("Заполните данные и примите согласие");
  }

  const db = getDb();
  const settings = await getSettings();
  let user: Awaited<ReturnType<typeof createUserWithUniquePhone>>;
  try {
    user = await createUserWithUniquePhone({ name, phone, city, password }, db);
  } catch (error) {
    if (isPhoneAlreadyRegisteredError(error)) {
      return apiError(PHONE_ALREADY_REGISTERED_MESSAGE, 409);
    }

    throw error;
  }
  await ensureGlobalQrToken(user);
  let membership: Awaited<ReturnType<typeof joinCompanyProgram>>;
  try {
    membership = await joinCompanyProgram(company.id, user.id);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Компания сейчас недоступна", 403);
  }
  await db.personalDataConsent.create({
    data: {
      userId: user.id,
      companyId: company.id,
      consentVersion: settings.privacyVersion,
      ip: request.headers.get("x-forwarded-for") ?? "local",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    },
  });
  await createSession(user);
  return ok({ membership }, 201);
}
