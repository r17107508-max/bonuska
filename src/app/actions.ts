"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  CompanyStatus,
  CompanyUserRole,
  LoyaltyProgramType,
  RaffleStatus,
} from "@prisma/client";
import {
  authenticate,
  clearSession,
  createSession,
  requireCompanyAdmin,
  requireUser,
  requireCompanyUser,
  requireSuperadmin,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { enforceCompanyRatingStatus } from "@/lib/company-reviews";
import { PHONE_ALREADY_REGISTERED_MESSAGE, normalizePhone, phoneLookupValues, slugify } from "@/lib/format";
import {
  addPurchase,
  ensureGlobalQrToken,
  findCustomerForGlobalScan,
  getSuspiciousLoyaltyReason,
  grantReward,
  joinCompanyProgram,
  redeemRewardClaimByToken,
  recordSuspiciousLoyaltyAttempt,
} from "@/lib/loyalty";
import { getMailConfigStatus, notifyCompanyApplicationReceived, notifyCompanyApproved, notifySuperadminsAboutCompanyApplication, sendPasswordResetEmail } from "@/lib/notifications";
import { finalizeRaffle, parseRublesToKopeks } from "@/lib/raffles";
import { getSettings } from "@/lib/settings";
import { createUserWithUniquePhone, isPhoneAlreadyRegisteredError } from "@/lib/users";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function numberValue(formData: FormData, name: string, fallback: number) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? value : fallback;
}

function optionalNumber(formData: FormData, name: string) {
  const raw = text(formData, name).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function optionalUrl(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function errorRedirect(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function successRedirect(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}success=${encodeURIComponent(message)}`);
}

function safeCompanyReturnPath(value: string, fallback: string) {
  if (value.startsWith("/company/scan") || value.startsWith("/company/client/") || value.startsWith("/company/raffles")) {
    return value;
  }

  return fallback;
}

async function requestMeta() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local",
    userAgent: h.get("user-agent") ?? "unknown",
    origin: `${proto}://${host}`,
  };
}

async function getOrCreateUser(data: {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  password: string;
}) {
  return createUserWithUniquePhone(data);
}

function phoneAlreadyRegisteredRedirect(error: unknown, path: string): never {
  if (isPhoneAlreadyRegisteredError(error)) {
    errorRedirect(path, PHONE_ALREADY_REGISTERED_MESSAGE);
  }

  throw error;
}

export async function loginSuperadmin(formData: FormData) {
  const user = await authenticate(normalizePhone(formData.get("phone")), text(formData, "password"));

  if (!user || user.globalRole !== "SUPERADMIN") {
    errorRedirect("/company/login", "Неверный телефон или пароль");
  }

  await createSession(user);
  redirect("/superadmin");
}

export async function loginCompany(formData: FormData) {
  const user = await authenticate(normalizePhone(formData.get("phone")), text(formData, "password"));

  if (!user) {
    errorRedirect("/company/login", "Неверный телефон или пароль");
  }

  if (user.globalRole === "SUPERADMIN") {
    await createSession(user);
    redirect("/superadmin");
  }

  const companyUser = await getDb().companyUser.findFirst({
    where: { userId: user.id, isActive: true, company: { status: { not: CompanyStatus.DELETED } } },
  });

  if (!companyUser) {
    errorRedirect("/company/login", "Пользователь не привязан к компании");
  }

  await createSession(user);
  redirect("/company");
}

export async function loginClient(formData: FormData) {
  const slug = text(formData, "slug");
  const user = await authenticate(normalizePhone(formData.get("phone")), text(formData, "password"));

  if (!user) {
    errorRedirect(`/c/${slug}`, "Неверный телефон или пароль");
  }

  const membership = await getDb().customerMembership.findFirst({
    where: { userId: user.id, company: { slug, status: { not: CompanyStatus.DELETED } } },
  });

  if (!membership) {
    errorRedirect(`/c/${slug}`, "Этот телефон не зарегистрирован в компании");
  }

  await ensureGlobalQrToken(user);
  await createSession(user);
  redirect(`/app/cards/${membership.id}`);
}

export async function loginClientAccount(formData: FormData) {
  const user = await authenticate(normalizePhone(formData.get("phone")), text(formData, "password"));

  if (!user) {
    errorRedirect("/client/login", "Неверный телефон или пароль");
  }

  await ensureGlobalQrToken(user);
  await createSession(user);
  redirect("/app");
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_RESEND_WINDOW_MS = 10 * 60 * 1000;
const PASSWORD_RESET_HOURLY_LIMIT = 3;
const PASSWORD_RESET_NEUTRAL_MESSAGE = "Если пользователь найден, ссылка для восстановления отправлена на email";

function passwordResetTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function passwordResetDone(): never {
  redirect(`/forgot-password?sent=1&message=${encodeURIComponent(PASSWORD_RESET_NEUTRAL_MESSAGE)}`);
}

export async function requestPasswordReset(formData: FormData) {
  const identifier = text(formData, "identifier").toLowerCase();

  if (!identifier) {
    errorRedirect("/forgot-password", "Введите телефон или email");
  }

  const db = getDb();
  const meta = await requestMeta();
  const phoneValues = phoneLookupValues(identifier);
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        ...(phoneValues.length > 0 ? [{ phone: { in: phoneValues } }] : []),
      ],
    },
    select: { id: true, email: true, name: true },
  });

  if (!user?.email) {
    passwordResetDone();
  }

  const now = new Date();
  const recentCutoff = new Date(now.getTime() - PASSWORD_RESET_RESEND_WINDOW_MS);
  const hourlyCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const [recentToken, hourlyCount] = await Promise.all([
    db.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null, createdAt: { gte: recentCutoff } },
      select: { id: true },
    }),
    db.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: hourlyCutoff } },
    }),
  ]);

  if (recentToken || hourlyCount >= PASSWORD_RESET_HOURLY_LIMIT) {
    passwordResetDone();
  }

  const mailStatus = getMailConfigStatus();
  if (!mailStatus.ready) {
    await db.auditLog.create({
      data: {
        action: "EMAIL_PASSWORD_RESET_SKIPPED",
        entityType: "EmailNotification",
        metadataJson: JSON.stringify({
          status: "skipped",
          recipients: [user.email],
          reason: `SMTP не настроен. Не хватает: ${mailStatus.missing.join(", ")}`,
        }),
      },
    });
    passwordResetDone();
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
  const resetRecord = await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: passwordResetTokenHash(token),
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || meta.origin;
  const result = await sendPasswordResetEmail({
    email: user.email,
    resetUrl: `${appUrl.replace(/\/$/, "")}/reset-password/${encodeURIComponent(token)}`,
    expiresAt,
  });

  if (result.status !== "sent") {
    await db.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });
  }

  passwordResetDone();
}

export async function completePasswordReset(formData: FormData) {
  const token = text(formData, "token");
  const password = text(formData, "password");
  const path = `/reset-password/${encodeURIComponent(token)}`;

  if (!token) {
    errorRedirect("/forgot-password", "Ссылка восстановления недействительна");
  }

  if (password.length < 6) {
    errorRedirect(path, "Новый пароль должен быть от 6 символов");
  }

  const tokenHash = passwordResetTokenHash(token);
  const resetToken = await getDb().passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: { id: true } } },
  });

  if (!resetToken) {
    errorRedirect(path, "Ссылка восстановления недействительна или устарела");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await getDb().$transaction([
    getDb().user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    getDb().passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await clearSession();
  redirect("/company/login?reset=1");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function updateCustomerProfile(formData: FormData) {
  const user = await requireUser("/app/account");
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const city = text(formData, "city");

  if (!name) {
    errorRedirect("/app/account", "Имя не может быть пустым");
  }

  if (!city) {
    errorRedirect("/app/account", "Укажите город");
  }

  await getDb().user.update({
    where: { id: user.id },
    data: {
      name,
      email: email || null,
      city,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/account");
  revalidatePath("/app/partners");
  redirect("/app/account?success=profile");
}

export async function changeCustomerPassword(formData: FormData) {
  const user = await requireUser("/app/account");
  const currentPassword = text(formData, "currentPassword");
  const newPassword = text(formData, "newPassword");

  if (newPassword.length < 6) {
    errorRedirect("/app/account", "Новый пароль должен быть от 6 символов");
  }

  const fullUser = await getDb().user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const passwordOk = await bcrypt.compare(currentPassword, fullUser.passwordHash);

  if (!passwordOk) {
    errorRedirect("/app/account", "Текущий пароль указан неверно");
  }

  await getDb().user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });

  redirect("/app/account?success=password");
}

export async function registerCompany(formData: FormData) {
  const settings = await getSettings();
  const name = text(formData, "name");
  const ownerName = text(formData, "ownerName");
  const phone = normalizePhone(formData.get("phone"));
  const email = text(formData, "email");
  const password = text(formData, "password");
  const city = text(formData, "city");
  const address = text(formData, "address");
  const acceptedOffer = formData.get("offerAccepted") === "on";
  const acceptedPrivacy = formData.get("privacyAccepted") === "on";

  if (!name || !ownerName || phone.length < 10 || !email || password.length < 6 || !city) {
    errorRedirect("/company/register", "Заполните обязательные поля");
  }

  if (!acceptedOffer || !acceptedPrivacy) {
    errorRedirect("/company/register", "Нужно принять оферту и согласие на обработку данных");
  }

  const db = getDb();
  const baseSlug = slugify(text(formData, "slug") || name) || `company-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;
  while (await db.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const meta = await requestMeta();
  let user: Awaited<ReturnType<typeof getOrCreateUser>>;
  try {
    user = await getOrCreateUser({ name: ownerName, phone, email, city, password });
  } catch (error) {
    phoneAlreadyRegisteredRedirect(error, "/company/register");
  }
  await ensureGlobalQrToken(user);
  const company = await db.company.create({
    data: {
      name,
      slug,
      businessType: text(formData, "businessType"),
      city,
      address,
      ownerName,
      ownerPhone: phone,
      ownerEmail: email,
      inn: text(formData, "inn") || null,
      comment: text(formData, "comment") || null,
      status: CompanyStatus.PENDING,
      users: {
        create: {
          userId: user.id,
          role: CompanyUserRole.COMPANY_ADMIN,
        },
      },
      loyaltyProgram: {
        create: {
          programType: LoyaltyProgramType.CLASSIC_REWARD,
          icon: "🎁",
          goalCount: 6,
          rewardTitle: "Подарок",
          rewardDescription: "Подарок после нужного количества покупок",
          themeColor: "#0f766e",
        },
      },
      offerAcceptances: {
        create: {
          userId: user.id,
          offerVersion: settings.offerVersion,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      },
      personalDataConsents: {
        create: {
          userId: user.id,
          consentVersion: settings.privacyVersion,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      },
      auditLogs: {
        create: {
          actorUserId: user.id,
          action: "COMPANY_APPLICATION_CREATED",
          entityType: "Company",
          metadataJson: JSON.stringify({ ownerEmail: email }),
        },
      },
    },
  });

  await Promise.all([
    notifySuperadminsAboutCompanyApplication(company, meta.origin),
    notifyCompanyApplicationReceived(company, meta.origin),
  ]);
  redirect("/company/register?success=1");
}

export async function approveCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const settings = await getSettings();
  const companyId = text(formData, "companyId");
  const meta = await requestMeta();
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + settings.trialDays);

  const company = await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.ACTIVE_TRIAL,
      isBlocked: false,
      trialStartedAt: now,
      trialEndsAt,
      auditLogs: {
        create: {
          actorUserId: admin.id,
          action: "COMPANY_APPROVED",
          entityType: "Company",
          entityId: companyId,
        },
      },
    },
  });

  await notifyCompanyApproved(company, meta.origin);
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/companies");
  redirect(`/superadmin/companies/${companyId}`);
}

export async function rejectCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const companyId = text(formData, "companyId");
  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.REJECTED,
      auditLogs: { create: { actorUserId: admin.id, action: "COMPANY_REJECTED", entityType: "Company", entityId: companyId } },
    },
  });
  revalidatePath("/superadmin/companies");
  redirect(`/superadmin/companies/${companyId}`);
}

export async function blockCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const companyId = text(formData, "companyId");
  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.BLOCKED,
      isBlocked: true,
      auditLogs: { create: { actorUserId: admin.id, action: "COMPANY_BLOCKED", entityType: "Company", entityId: companyId } },
    },
  });
  redirect(`/superadmin/companies/${companyId}`);
}

export async function deleteCompanySoft(formData: FormData) {
  const admin = await requireSuperadmin();
  const companyId = text(formData, "companyId");
  const now = new Date();

  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.DELETED,
      isBlocked: true,
      deletedAt: now,
      users: {
        updateMany: {
          where: { isActive: true },
          data: { isActive: false },
        },
      },
      auditLogs: {
        create: {
          actorUserId: admin.id,
          action: "COMPANY_SOFT_DELETED",
          entityType: "Company",
          entityId: companyId,
          metadataJson: JSON.stringify({ deletedAt: now.toISOString() }),
        },
      },
    },
  });

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/companies");
  redirect(`/superadmin/companies/${companyId}`);
}

export async function unblockCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const companyId = text(formData, "companyId");
  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.PAYMENT_REQUIRED,
      isBlocked: false,
      ratingLowSince: null,
      ratingBlockedAt: null,
      auditLogs: { create: { actorUserId: admin.id, action: "COMPANY_UNBLOCKED", entityType: "Company", entityId: companyId } },
    },
  });
  redirect(`/superadmin/companies/${companyId}`);
}

export async function markPayment(formData: FormData) {
  const admin = await requireSuperadmin();
  const settings = await getSettings();
  const companyId = text(formData, "companyId");
  const company = await getDb().company.findUniqueOrThrow({ where: { id: companyId } });
  const periodStart = company.paidUntil && company.paidUntil > new Date() ? company.paidUntil : new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await getDb().subscriptionPayment.create({
    data: {
      companyId,
      amount: settings.subscriptionPrice,
      paidAt: new Date(),
      periodStart,
      periodEnd,
      method: "manual",
      comment: text(formData, "comment") || null,
      confirmedById: admin.id,
    },
  });

  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.ACTIVE_PAID,
      paidUntil: periodEnd,
      lastPaidAt: new Date(),
      isBlocked: false,
      auditLogs: { create: { actorUserId: admin.id, action: "PAYMENT_CONFIRMED", entityType: "SubscriptionPayment", metadataJson: JSON.stringify({ amount: settings.subscriptionPrice }) } },
    },
  });

  console.log(`[email stub] Оплата подтверждена для компании ${company.name}`);
  redirect(`/superadmin/companies/${companyId}`);
}

export async function requestPaymentReview(formData: FormData) {
  const access = await requireCompanyAdmin();
  await getDb().auditLog.create({
    data: {
      actorUserId: access.userId,
      companyId: access.companyId,
      action: "PAYMENT_REVIEW_REQUESTED",
      entityType: "Company",
      entityId: access.companyId,
      metadataJson: JSON.stringify({
        comment: text(formData, "comment") || null,
        createdAt: new Date().toISOString(),
      }),
    },
  });

  redirect("/company/billing?success=1");
}

export async function extendCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const companyId = text(formData, "companyId");
  const company = await getDb().company.findUniqueOrThrow({ where: { id: companyId } });
  const from = company.paidUntil && company.paidUntil > new Date() ? company.paidUntil : new Date();
  const paidUntil = new Date(from);
  paidUntil.setDate(paidUntil.getDate() + 30);

  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.ACTIVE_PAID,
      paidUntil,
      isBlocked: false,
      auditLogs: { create: { actorUserId: admin.id, action: "SUBSCRIPTION_EXTENDED", entityType: "Company", entityId: companyId } },
    },
  });
  redirect(`/superadmin/companies/${companyId}`);
}

export async function saveServiceSettings(formData: FormData) {
  await requireSuperadmin();
  await getDb().serviceSettings.upsert({
    where: { id: "default" },
    update: {
      subscriptionPrice: numberValue(formData, "subscriptionPrice", 499),
      trialDays: numberValue(formData, "trialDays", 14),
      paymentRequisites: text(formData, "paymentRequisites"),
      offerText: text(formData, "offerText"),
      offerVersion: text(formData, "offerVersion") || "1.0",
      privacyText: text(formData, "privacyText"),
      privacyVersion: text(formData, "privacyVersion") || "1.0",
      supportEmail: text(formData, "supportEmail") || "rf173@bk.ru",
    },
    create: {
      id: "default",
      subscriptionPrice: numberValue(formData, "subscriptionPrice", 499),
      trialDays: numberValue(formData, "trialDays", 14),
      paymentRequisites: text(formData, "paymentRequisites"),
      offerText: text(formData, "offerText"),
      offerVersion: text(formData, "offerVersion") || "1.0",
      privacyText: text(formData, "privacyText"),
      privacyVersion: text(formData, "privacyVersion") || "1.0",
      supportEmail: text(formData, "supportEmail") || "rf173@bk.ru",
    },
  });
  redirect("/superadmin/settings?success=1");
}

export async function saveCompanySettings(formData: FormData) {
  const access = await requireCompanyAdmin();
  const goalCount = Math.min(20, Math.max(3, numberValue(formData, "goalCount", 6)));
  const slug = slugify(text(formData, "slug")) || access.company.slug;
  const programType = text(formData, "programType") as LoyaltyProgramType;
  const gifts = text(formData, "giftOptions")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!Object.values(LoyaltyProgramType).includes(programType)) {
    errorRedirect("/company/settings", "Выберите корректный тип программы");
  }

  if (programType === LoyaltyProgramType.CUSTOMER_LEVELS) {
    errorRedirect("/company/settings", "Режим «Постоянный уровень клиента» временно отключен для восстановления стабильной работы");
  }

  if (programType === LoyaltyProgramType.GIFT_BOX && gifts.length === 0) {
    errorRedirect("/company/settings", "Для режима «Коробка с подарком» нужно указать хотя бы один подарок");
  }

  await getDb().$transaction(async (tx) => {
    await tx.company.update({
      where: { id: access.companyId },
      data: {
        name: text(formData, "name"),
        description: text(formData, "description"),
        slug,
        businessType: text(formData, "businessType"),
        icon: text(formData, "icon") || "🎁",
        themeColor: text(formData, "themeColor") || "#0f766e",
        city: text(formData, "city") || access.company.city,
        address: text(formData, "address"),
        website: optionalUrl(formData, "website"),
        logoUrl: optionalUrl(formData, "logoUrl"),
        latitude: optionalNumber(formData, "latitude"),
        longitude: optionalNumber(formData, "longitude"),
        ownerPhone: text(formData, "phone") || access.company.ownerPhone,
        loyaltyProgram: {
          upsert: {
            update: {
              programType,
              icon: text(formData, "icon") || "🎁",
              goalCount,
              rewardTitle: text(formData, "rewardTitle"),
              rewardDescription: text(formData, "rewardDescription"),
              themeColor: text(formData, "themeColor") || "#0f766e",
              isGiftBoxEnabled: programType === LoyaltyProgramType.GIFT_BOX,
            },
            create: {
              programType,
              icon: text(formData, "icon") || "🎁",
              goalCount,
              rewardTitle: text(formData, "rewardTitle"),
              rewardDescription: text(formData, "rewardDescription"),
              themeColor: text(formData, "themeColor") || "#0f766e",
              isGiftBoxEnabled: programType === LoyaltyProgramType.GIFT_BOX,
            },
          },
        },
        auditLogs: {
          create: {
            actorUserId: access.userId,
            action: "COMPANY_SETTINGS_UPDATED",
            entityType: "Company",
            entityId: access.companyId,
          },
        },
      },
    });

    await tx.giftOption.deleteMany({ where: { companyId: access.companyId } });
    if (gifts.length > 0) {
      await tx.giftOption.createMany({
        data: gifts.map((title) => ({ companyId: access.companyId, title })),
      });
    }
  });

  redirect("/company/settings?success=1");
}

export async function submitCompanyReview(formData: FormData) {
  const user = await requireUser("/app");
  const slug = text(formData, "slug");
  const rating = Math.min(5, Math.max(1, Math.round(numberValue(formData, "rating", 0))));
  const reviewText = text(formData, "text");

  if (!slug || rating < 1 || rating > 5) {
    errorRedirect("/app/partners", "Поставьте оценку от 1 до 5");
  }

  const company = await getDb().company.findUnique({
    where: { slug },
    select: { id: true, slug: true, status: true },
  });

  if (!company || company.status === CompanyStatus.DELETED) {
    errorRedirect("/app/partners", "Компания не найдена");
  }

  const membership = await getDb().customerMembership.findFirst({
    where: { companyId: company.id, userId: user.id },
    select: { id: true },
  });

  if (!membership) {
    errorRedirect(`/app/companies/${company.slug}`, "Оставить отзыв могут клиенты этой точки");
  }

  await getDb().companyReview.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: {
      rating,
      text: reviewText || null,
    },
    create: {
      companyId: company.id,
      userId: user.id,
      rating,
      text: reviewText || null,
    },
  });

  await enforceCompanyRatingStatus(company.id);
  revalidatePath("/app/partners");
  revalidatePath(`/app/companies/${company.slug}`);
  redirect(`/app/companies/${company.slug}?success=review`);
}

export async function createStaff(formData: FormData) {
  const access = await requireCompanyAdmin();
  const phone = normalizePhone(formData.get("phone"));
  const password = text(formData, "password");
  if (!text(formData, "name") || phone.length < 10 || password.length < 6) {
    errorRedirect("/company/staff", "Заполните имя, телефон и пароль от 6 символов");
  }

  let user: Awaited<ReturnType<typeof getOrCreateUser>>;
  try {
    user = await getOrCreateUser({
      name: text(formData, "name"),
      phone,
      city: access.company.city,
      password,
    });
  } catch (error) {
    phoneAlreadyRegisteredRedirect(error, "/company/staff");
  }
  await ensureGlobalQrToken(user);

  await getDb().companyUser.upsert({
    where: { companyId_userId: { companyId: access.companyId, userId: user.id } },
    update: { role: text(formData, "role") as CompanyUserRole, isActive: formData.get("isActive") === "on" },
    create: {
      companyId: access.companyId,
      userId: user.id,
      role: text(formData, "role") as CompanyUserRole,
      isActive: true,
    },
  });

  redirect("/company/staff");
}

export async function registerCustomer(formData: FormData) {
  const slug = text(formData, "slug");
  const company = await getDb().company.findUnique({
    where: { slug },
    include: { loyaltyProgram: true },
  });

  if (!company) {
    errorRedirect("/", "Компания не найдена");
  }

  const phone = normalizePhone(formData.get("phone"));
  const password = text(formData, "password");
  const city = text(formData, "city") || company.city;
  if (!text(formData, "name") || phone.length < 10 || password.length < 6 || !city) {
    errorRedirect(`/c/${slug}`, "Заполните имя, телефон и пароль от 6 символов");
  }

  if (formData.get("privacyAccepted") !== "on") {
    errorRedirect(`/c/${slug}`, "Нужно согласие на обработку персональных данных");
  }

  const meta = await requestMeta();
  const settings = await getSettings();
  let user: Awaited<ReturnType<typeof getOrCreateUser>>;
  try {
    user = await getOrCreateUser({
      name: text(formData, "name"),
      phone,
      city,
      password,
    });
  } catch (error) {
    phoneAlreadyRegisteredRedirect(error, `/c/${slug}`);
  }
  await ensureGlobalQrToken(user);

  try {
    await joinCompanyProgram(company.id, user.id);
  } catch (error) {
    errorRedirect(`/c/${slug}`, error instanceof Error ? error.message : "Компания сейчас недоступна");
  }

  await getDb().personalDataConsent.create({
    data: {
      companyId: company.id,
      userId: user.id,
      consentVersion: settings.privacyVersion,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  await createSession(user);
  redirect("/app");
}

export async function registerClientAccount(formData: FormData) {
  const name = text(formData, "name");
  const phone = normalizePhone(formData.get("phone"));
  const password = text(formData, "password");
  const city = text(formData, "city");

  if (!name || phone.length < 10 || password.length < 6 || !city) {
    errorRedirect("/client/register", "Заполните имя, телефон и пароль от 6 символов");
  }

  if (formData.get("privacyAccepted") !== "on") {
    errorRedirect("/client/register", "Нужно согласие на обработку персональных данных");
  }

  const meta = await requestMeta();
  const settings = await getSettings();
  let user: Awaited<ReturnType<typeof getOrCreateUser>>;
  try {
    user = await createUserWithUniquePhone({
      name,
      phone,
      city,
      password,
    });
  } catch (error) {
    phoneAlreadyRegisteredRedirect(error, "/client/register");
  }

  await getDb().personalDataConsent.create({
    data: {
      userId: user.id,
      consentVersion: settings.privacyVersion,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  await ensureGlobalQrToken(user);
  await createSession(user);
  redirect("/app");
}

export async function hideCompanyOnboardingChecklist() {
  const access = await requireCompanyAdmin();

  await getDb().company.update({
    where: { id: access.companyId },
    data: { onboardingChecklistHidden: true },
  });

  revalidatePath("/company");
  redirect("/company");
}

export async function showCompanyOnboardingChecklist() {
  const access = await requireCompanyAdmin();

  await getDb().company.update({
    where: { id: access.companyId },
    data: { onboardingChecklistHidden: false },
  });

  revalidatePath("/company");
  revalidatePath("/company/settings");
  redirect("/company/settings?success=1");
}

export async function joinCompanyFromPublicPage(formData: FormData) {
  const slug = text(formData, "slug");
  const user = await requireUser(`/c/${slug}`);
  const company = await getDb().company.findUnique({
    where: { slug },
    include: { loyaltyProgram: true },
  });

  if (!company || !company.loyaltyProgram) {
    errorRedirect("/", "Компания не найдена");
  }

  await ensureGlobalQrToken(user);
  let membership: Awaited<ReturnType<typeof joinCompanyProgram>>;
  try {
    membership = await joinCompanyProgram(company.id, user.id);
  } catch (error) {
    errorRedirect(`/c/${slug}`, error instanceof Error ? error.message : "Компания сейчас недоступна");
  }
  redirect(`/app/cards/${membership.id}`);
}

export async function confirmPurchase(formData: FormData) {
  const access = await requireCompanyUser();
  const membershipId = text(formData, "membershipId");
  const token = text(formData, "token");
  const fallbackPath = `/company/scan?token=${encodeURIComponent(token)}`;
  const returnTo = safeCompanyReturnPath(text(formData, "returnTo"), fallbackPath);
  const quantity = numberValue(formData, "quantity", 1);
  const purchaseAmountKopeks = parseRublesToKopeks(formData.get("purchaseAmount"));
  let successMessage = "Начислено";
  try {
    const result = await addPurchase(access.companyId, membershipId, access.userId, quantity, purchaseAmountKopeks);
    successMessage = purchaseSuccessMessage(result);
  } catch (error) {
    const suspiciousReason = getSuspiciousLoyaltyReason(error);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: access.companyId,
        membershipId,
        cashierId: access.userId,
        token,
        source: "scan",
        operation: "purchase",
        reason: suspiciousReason,
      });
    }
    errorRedirect(returnTo, error instanceof Error ? error.message : "Не удалось начислить покупку");
  }
  revalidatePath("/company");
  revalidatePath("/company/clients");
  revalidatePath(`/company/client/${membershipId}`);
  successRedirect(returnTo, successMessage);
}

export async function joinScannedCustomerAndConfirmPurchase(formData: FormData) {
  const access = await requireCompanyUser();
  const token = text(formData, "token");
  const quantity = numberValue(formData, "quantity", 1);
  const purchaseAmountKopeks = parseRublesToKopeks(formData.get("purchaseAmount"));
  let membershipIdForLog = "";
  let successMessage = "Клиент подключён, покупка начислена";

  try {
    const customer = await findCustomerForGlobalScan(access.companyId, token);
    if (!customer) {
      throw new Error("Клиент не найден или уже подключён к программе вашей компании");
    }
    if (customer.id === access.userId) {
      throw new Error("Кассир не может начислять покупки самому себе");
    }

    const membership = await joinCompanyProgram(access.companyId, customer.id, access.userId);
    membershipIdForLog = membership.id;
    const result = await addPurchase(access.companyId, membership.id, access.userId, quantity, purchaseAmountKopeks);
    successMessage = `Клиент подключён. ${purchaseSuccessMessage(result)}`;
  } catch (error) {
    const suspiciousReason = getSuspiciousLoyaltyReason(error);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: access.companyId,
        membershipId: membershipIdForLog,
        cashierId: access.userId,
        token,
        source: "scan",
        operation: "purchase",
        reason: suspiciousReason,
      });
    }
    errorRedirect(`/company/scan?token=${encodeURIComponent(token)}`, error instanceof Error ? error.message : "Не удалось подключить клиента");
  }

  revalidatePath("/company");
  redirect(`/company/scan?token=${encodeURIComponent(token)}&success=${encodeURIComponent(successMessage)}`);
}

function purchaseSuccessMessage(result: Awaited<ReturnType<typeof addPurchase>>) {
  const base = result.levelUp
    ? `🎉 Клиент достиг нового уровня: ${result.levelUp.name}`
    : result.rewardAvailable
      ? `Начислено: ${result.quantity}. Подарок доступен`
      : `Начислено: ${result.quantity}`;

  return result.raffleTicket
    ? `${base}. Номер для розыгрыша: ${result.raffleTicket.number}`
    : base;
}

function raffleFormValues(formData: FormData) {
  const title = text(formData, "title");
  const minPurchaseAmountKopeks = parseRublesToKopeks(formData.get("minPurchaseAmount"));
  const participationEndsAt = new Date(text(formData, "participationEndsAt"));
  const drawAt = new Date(text(formData, "drawAt"));
  const firstPrizeTitle = text(formData, "firstPrizeTitle");
  const secondPrizeTitle = text(formData, "secondPrizeTitle");
  const thirdPrizeTitle = text(formData, "thirdPrizeTitle");

  return {
    title,
    minPurchaseAmountKopeks,
    participationEndsAt,
    drawAt,
    firstPrizeTitle,
    secondPrizeTitle,
    thirdPrizeTitle,
  };
}

function validateRaffleForm(values: ReturnType<typeof raffleFormValues>) {
  if (
    !values.title ||
    values.minPurchaseAmountKopeks <= 0 ||
    !values.firstPrizeTitle ||
    !values.secondPrizeTitle ||
    !values.thirdPrizeTitle
  ) {
    return "Заполните название, сумму покупки и все три приза";
  }

  if (Number.isNaN(values.participationEndsAt.getTime()) || Number.isNaN(values.drawAt.getTime())) {
    return "Укажите дату окончания участия и дату розыгрыша";
  }

  if (values.drawAt <= values.participationEndsAt) {
    return "Дата розыгрыша должна быть позже окончания участия";
  }

  return null;
}

export async function createCompanyRaffle(formData: FormData) {
  const access = await requireCompanyAdmin();
  const values = raffleFormValues(formData);
  const error = validateRaffleForm(values);

  if (error) {
    errorRedirect("/company/raffles", error);
  }

  await getDb().companyRaffle.create({
    data: {
      companyId: access.companyId,
      ...values,
      status: RaffleStatus.ACTIVE,
    },
  });

  revalidatePath("/company");
  revalidatePath("/company/raffles");
  successRedirect("/company/raffles", "Розыгрыш создан и активен");
}

export async function updateCompanyRaffle(formData: FormData) {
  const access = await requireCompanyAdmin();
  const raffleId = text(formData, "raffleId");
  const values = raffleFormValues(formData);
  const error = validateRaffleForm(values);

  if (error) {
    errorRedirect("/company/raffles", error);
  }

  const raffle = await getDb().companyRaffle.findFirst({
    where: { id: raffleId, companyId: access.companyId },
    select: { id: true, status: true },
  });

  if (!raffle) {
    errorRedirect("/company/raffles", "Розыгрыш не найден");
  }

  if (raffle.status === RaffleStatus.DRAWN) {
    errorRedirect("/company/raffles", "Разыгранный розыгрыш нельзя редактировать");
  }

  await getDb().companyRaffle.update({
    where: { id: raffle.id },
    data: values,
  });

  revalidatePath("/company");
  revalidatePath("/company/raffles");
  successRedirect("/company/raffles", "Розыгрыш обновлён");
}

export async function deleteCompanyRaffle(formData: FormData) {
  const access = await requireCompanyAdmin();
  const raffleId = text(formData, "raffleId");
  const raffle = await getDb().companyRaffle.findFirst({
    where: { id: raffleId, companyId: access.companyId },
    select: { id: true, status: true },
  });

  if (!raffle) {
    errorRedirect("/company/raffles", "Розыгрыш не найден");
  }

  if (raffle.status === RaffleStatus.DRAWN) {
    errorRedirect("/company/raffles", "Разыгранный розыгрыш нельзя удалить");
  }

  await getDb().companyRaffle.delete({
    where: { id: raffle.id },
  });

  revalidatePath("/company");
  revalidatePath("/company/raffles");
  successRedirect("/company/raffles", "Розыгрыш удалён");
}

export async function drawCompanyRaffle(formData: FormData) {
  const access = await requireCompanyAdmin();
  const raffleId = text(formData, "raffleId");
  const raffle = await getDb().companyRaffle.findFirst({
    where: { id: raffleId, companyId: access.companyId },
    select: { id: true, drawAt: true, status: true },
  });

  if (!raffle) {
    errorRedirect("/company/raffles", "Розыгрыш не найден");
  }

  if (raffle.status === RaffleStatus.DRAWN) {
    successRedirect("/company/raffles", "Победители уже зафиксированы");
  }

  if (raffle.drawAt > new Date()) {
    errorRedirect("/company/raffles", "Победителей можно фиксировать только после даты розыгрыша");
  }

  await finalizeRaffle(raffle.id);
  revalidatePath("/company");
  revalidatePath("/company/raffles");
  successRedirect("/company/raffles", "Победители зафиксированы на сервере");
}

export async function giveReward(formData: FormData) {
  const access = await requireCompanyUser();
  const membershipId = text(formData, "membershipId");
  const token = text(formData, "token");
  try {
    await grantReward(access.companyId, membershipId, access.userId);
  } catch (error) {
    const suspiciousReason = getSuspiciousLoyaltyReason(error);
    if (suspiciousReason) {
      await recordSuspiciousLoyaltyAttempt({
        companyId: access.companyId,
        membershipId,
        cashierId: access.userId,
        token,
        source: "scan",
        operation: "reward",
        reason: suspiciousReason,
      });
    }
    errorRedirect(`/company/scan?token=${encodeURIComponent(token)}`, error instanceof Error ? error.message : "Не удалось выдать подарок");
  }
  redirect(`/company/scan?token=${encodeURIComponent(token)}&success=${encodeURIComponent("Подарок выдан")}`);
}

export async function redeemRewardClaim(formData: FormData) {
  const access = await requireCompanyUser();
  const token = text(formData, "token");
  try {
    await redeemRewardClaimByToken(access.companyId, token, access.userId);
  } catch (error) {
    errorRedirect(`/company/scan?token=${encodeURIComponent(token)}`, error instanceof Error ? error.message : "Не удалось выдать подарок");
  }
  redirect(`/company/scan?token=${encodeURIComponent(token)}&success=${encodeURIComponent("Подарок выдан")}`);
}

export async function deleteClient(formData: FormData) {
  const access = await requireCompanyAdmin();
  const membershipId = text(formData, "membershipId");
  const membership = await getDb().customerMembership.findFirst({
    where: { id: membershipId, companyId: access.companyId },
    select: { id: true },
  });

  if (!membership) {
    errorRedirect("/company/clients", "Клиент не найден в вашей компании");
  }

  await getDb().customerMembership.delete({
    where: { id: membership.id },
  });
  await getDb().auditLog.create({
    data: {
      actorUserId: access.userId,
      companyId: access.companyId,
      action: "CUSTOMER_MEMBERSHIP_DELETED",
      entityType: "CustomerMembership",
      entityId: membership.id,
    },
  });
  redirect("/company/clients");
}

export async function leaveCustomerMembership(formData: FormData) {
  const user = await requireUser("/app");
  const membershipId = text(formData, "membershipId");
  const membership = await getDb().customerMembership.findFirst({
    where: { id: membershipId, userId: user.id },
    select: { id: true, companyId: true },
  });

  if (!membership) {
    errorRedirect("/app/cards", "Карта не найдена");
  }

  await getDb().customerMembership.delete({
    where: { id: membership.id },
  });
  await getDb().auditLog.create({
    data: {
      actorUserId: user.id,
      companyId: membership.companyId,
      action: "CUSTOMER_MEMBERSHIP_LEFT",
      entityType: "CustomerMembership",
      entityId: membership.id,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/cards");
  redirect("/app/cards");
}

export async function deleteCustomerAccount() {
  const user = await requireUser("/app");

  if (user.globalRole === "SUPERADMIN") {
    errorRedirect("/app/account", "Супер-админ не может удалить аккаунт из клиентского кабинета");
  }

  const [companyAccess, cashierTransactions, confirmedPayments] = await Promise.all([
    getDb().companyUser.findFirst({
      where: { userId: user.id },
      select: { id: true },
    }),
    getDb().loyaltyTransaction.count({ where: { cashierId: user.id } }),
    getDb().subscriptionPayment.count({ where: { confirmedById: user.id } }),
  ]);

  if (companyAccess || cashierTransactions > 0 || confirmedPayments > 0) {
    errorRedirect("/app/account", "Аккаунт связан с компанией или операциями. Сначала передайте доступ и обратитесь к администратору сервиса.");
  }

  await getDb().user.delete({ where: { id: user.id } });
  await clearSession();
  redirect("/");
}
