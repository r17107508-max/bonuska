import { NextRequest } from "next/server";
import { CompanyStatus, CompanyUserRole } from "@prisma/client";
import { apiError, ok, safeCompanySelect } from "@/lib/api";
import { getDb } from "@/lib/db";
import { PHONE_ALREADY_REGISTERED_MESSAGE, normalizePhone, slugify } from "@/lib/format";
import { ensureGlobalQrToken } from "@/lib/loyalty";
import { getSettings } from "@/lib/settings";
import { createUserWithUniquePhone, isPhoneAlreadyRegisteredError } from "@/lib/users";
import { notifySuperadminsAboutCompanyPush } from "@/lib/web-push";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const city = String(body.city ?? "").trim();

  if (!name || !ownerName || phone.length < 10 || !email || password.length < 6 || !city || !body.offerAccepted || !body.privacyAccepted) {
    return apiError("Заполните обязательные поля и примите документы");
  }

  const db = getDb();
  const settings = await getSettings();
  let user: Awaited<ReturnType<typeof createUserWithUniquePhone>>;
  try {
    user = await createUserWithUniquePhone({ name: ownerName, phone, email, city, password }, db);
  } catch (error) {
    if (isPhoneAlreadyRegisteredError(error)) {
      return apiError(PHONE_ALREADY_REGISTERED_MESSAGE, 409);
    }

    throw error;
  }
  await ensureGlobalQrToken(user);

  const baseSlug = slugify(String(body.slug ?? name)) || `company-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;
  while (await db.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const company = await db.company.create({
    data: {
      name,
      slug,
      businessType: String(body.businessType ?? "Другое"),
      city,
      address: String(body.address ?? ""),
      ownerName,
      ownerPhone: phone,
      ownerEmail: email,
      inn: body.inn ? String(body.inn) : null,
      comment: body.comment ? String(body.comment) : null,
      status: CompanyStatus.PENDING,
      users: { create: { userId: user.id, role: CompanyUserRole.COMPANY_ADMIN } },
      loyaltyProgram: { create: { icon: "🎁", rewardTitle: "Подарок", rewardDescription: "Подарок после покупок" } },
      offerAcceptances: { create: { userId: user.id, offerVersion: settings.offerVersion, ip: request.headers.get("x-forwarded-for") ?? "local", userAgent: request.headers.get("user-agent") ?? "unknown" } },
      personalDataConsents: { create: { userId: user.id, consentVersion: settings.privacyVersion, ip: request.headers.get("x-forwarded-for") ?? "local", userAgent: request.headers.get("user-agent") ?? "unknown" } },
      auditLogs: { create: { actorUserId: user.id, action: "COMPANY_APPLICATION_CREATED_API", entityType: "Company" } },
    },
    select: safeCompanySelect,
  });

  await notifySuperadminsAboutCompanyPush(company);

  return ok({ company }, 201);
}
