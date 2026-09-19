import { NextRequest } from "next/server";
import { CompanyStatus, CompanyUserRole, Prisma } from "@prisma/client";
import { apiError, ok, safeCompanySelect } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  PHONE_ALREADY_REGISTERED_MESSAGE,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  slugify,
} from "@/lib/format";
import { notifyCompanyApplicationReceived, notifySuperadminsAboutCompanyApplication } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";
import { createUserWithUniquePhone, isEmailAlreadyRegisteredError, isPhoneAlreadyRegisteredError } from "@/lib/users";
import { notifySuperadminsAboutCompanyPush } from "@/lib/web-push";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const city = String(body.city ?? "").trim();

  if (!name || !ownerName || phone.length < 10 || !isValidEmail(email) || password.length < 10 || !city || !body.offerAccepted || !body.privacyAccepted) {
    return apiError("Заполните обязательные поля и примите документы");
  }

  const db = getDb();
  const settings = await getSettings();
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + settings.trialDays);

  let registration: {
    user: Awaited<ReturnType<typeof createUserWithUniquePhone>>;
    company: Prisma.CompanyGetPayload<{ select: typeof safeCompanySelect }>;
  };
  try {
    const baseSlug = slugify(String(body.slug ?? name)) || `company-${Date.now()}`;
    let slug = baseSlug;
    let suffix = 2;
    while (await db.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    registration = await db.$transaction(async (transaction) => {
      const user = await createUserWithUniquePhone({ name: ownerName, phone, email, city, password }, transaction);
      const company = await transaction.company.create({
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
          status: CompanyStatus.ACTIVE_TRIAL,
          isBlocked: false,
          trialStartedAt: now,
          trialEndsAt,
          users: { create: { userId: user.id, role: CompanyUserRole.COMPANY_ADMIN } },
          loyaltyProgram: { create: { icon: "🎁", rewardTitle: "Подарок", rewardDescription: "Подарок после покупок" } },
          offerAcceptances: { create: { userId: user.id, offerVersion: settings.offerVersion, ip: request.headers.get("x-forwarded-for") ?? "local", userAgent: request.headers.get("user-agent") ?? "unknown" } },
          personalDataConsents: { create: { userId: user.id, consentVersion: settings.privacyVersion, ip: request.headers.get("x-forwarded-for") ?? "local", userAgent: request.headers.get("user-agent") ?? "unknown" } },
          auditLogs: { create: { actorUserId: user.id, action: "COMPANY_REGISTERED_TRIAL_STARTED_API", entityType: "Company", metadataJson: JSON.stringify({ trialEndsAt: trialEndsAt.toISOString() }) } },
        },
        select: safeCompanySelect,
      });

      return { user, company };
    });
  } catch (error) {
    if (isPhoneAlreadyRegisteredError(error)) {
      return apiError(PHONE_ALREADY_REGISTERED_MESSAGE, 409);
    }
    if (isEmailAlreadyRegisteredError(error)) {
      return apiError(EMAIL_ALREADY_REGISTERED_MESSAGE, 409);
    }

    throw error;
  }

  const { user, company } = registration;
  await createSession(user);
  const origin = new URL(request.url).origin;
  await Promise.allSettled([
    notifySuperadminsAboutCompanyApplication(company, origin),
    notifyCompanyApplicationReceived(company, origin),
    notifySuperadminsAboutCompanyPush(company),
  ]);

  return ok({ company, redirectTo: "/company" }, 201);
}
