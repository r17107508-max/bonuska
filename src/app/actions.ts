"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  CompanyStatus,
  CompanyUserRole,
  LoyaltyProgramType,
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
import { normalizePhone, slugify } from "@/lib/format";
import {
  addPurchase,
  ensureGlobalQrToken,
  findCustomerForGlobalScan,
  getSuspiciousLoyaltyReason,
  grantReward,
  joinCompanyProgram,
  newGlobalQrToken,
  recordSuspiciousLoyaltyAttempt,
} from "@/lib/loyalty";
import { notifyCompanyApproved, notifySuperadminsAboutCompanyApplication } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function numberValue(formData: FormData, name: string, fallback: number) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? value : fallback;
}

function errorRedirect(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
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
  password: string;
}) {
  const db = getDb();
  const passwordHash = await bcrypt.hash(data.password, 10);

  return db.user.upsert({
    where: { phone: data.phone },
    update: {
      name: data.name,
      email: data.email || undefined,
      passwordHash,
    },
    create: {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      passwordHash,
      globalQrToken: newGlobalQrToken(),
    },
  });
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
    where: { userId: user.id, isActive: true },
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
    where: { userId: user.id, company: { slug } },
  });

  if (!membership) {
    errorRedirect(`/c/${slug}`, "Этот телефон не зарегистрирован в компании");
  }

  await ensureGlobalQrToken(user);
  await createSession(user);
  redirect(`/app/cards/${membership.id}`);
}

export async function resetPassword(formData: FormData) {
  const phone = normalizePhone(formData.get("phone"));
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (phone.length < 10 || !email || password.length < 6) {
    errorRedirect("/forgot-password", "Заполните телефон, email и новый пароль от 6 символов");
  }

  const user = await getDb().user.findUnique({
    where: { phone },
  });

  if (!user || user.email?.toLowerCase() !== email) {
    errorRedirect("/forgot-password", "Пользователь с таким телефоном и email не найден");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await getDb().user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await clearSession();
  redirect("/company/login?reset=1");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function registerCompany(formData: FormData) {
  const settings = await getSettings();
  const name = text(formData, "name");
  const ownerName = text(formData, "ownerName");
  const phone = normalizePhone(formData.get("phone"));
  const email = text(formData, "email");
  const password = text(formData, "password");
  const acceptedOffer = formData.get("offerAccepted") === "on";
  const acceptedPrivacy = formData.get("privacyAccepted") === "on";

  if (!name || !ownerName || phone.length < 10 || !email || password.length < 6) {
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
  const user = await getOrCreateUser({ name: ownerName, phone, email, password });
  await ensureGlobalQrToken(user);
  const company = await db.company.create({
    data: {
      name,
      slug,
      businessType: text(formData, "businessType"),
      city: text(formData, "city"),
      address: text(formData, "address"),
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

  await notifySuperadminsAboutCompanyApplication(company, meta.origin);
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

export async function unblockCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const companyId = text(formData, "companyId");
  await getDb().company.update({
    where: { id: companyId },
    data: {
      status: CompanyStatus.PAYMENT_REQUIRED,
      isBlocked: false,
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

  await getDb().company.update({
    where: { id: access.companyId },
    data: {
      name: text(formData, "name"),
      description: text(formData, "description"),
      slug,
      businessType: text(formData, "businessType"),
      icon: text(formData, "icon") || "🎁",
      themeColor: text(formData, "themeColor") || "#0f766e",
      address: text(formData, "address"),
      ownerPhone: text(formData, "phone") || access.company.ownerPhone,
      loyaltyProgram: {
        upsert: {
          update: {
            programType: text(formData, "programType") as LoyaltyProgramType,
            icon: text(formData, "icon") || "🎁",
            goalCount,
            rewardTitle: text(formData, "rewardTitle"),
            rewardDescription: text(formData, "rewardDescription"),
            themeColor: text(formData, "themeColor") || "#0f766e",
            isGiftBoxEnabled: text(formData, "programType") === LoyaltyProgramType.GIFT_BOX,
          },
          create: {
            programType: text(formData, "programType") as LoyaltyProgramType,
            icon: text(formData, "icon") || "🎁",
            goalCount,
            rewardTitle: text(formData, "rewardTitle"),
            rewardDescription: text(formData, "rewardDescription"),
            themeColor: text(formData, "themeColor") || "#0f766e",
            isGiftBoxEnabled: text(formData, "programType") === LoyaltyProgramType.GIFT_BOX,
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

  const gifts = text(formData, "giftOptions")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (gifts.length > 0) {
    await getDb().giftOption.deleteMany({ where: { companyId: access.companyId } });
    await getDb().giftOption.createMany({
      data: gifts.map((title) => ({ companyId: access.companyId, title })),
    });
  }

  redirect("/company/settings?success=1");
}

export async function createStaff(formData: FormData) {
  const access = await requireCompanyAdmin();
  const phone = normalizePhone(formData.get("phone"));
  const password = text(formData, "password");
  if (!text(formData, "name") || phone.length < 10 || password.length < 6) {
    errorRedirect("/company/staff", "Заполните имя, телефон и пароль от 6 символов");
  }

  const user = await getOrCreateUser({
    name: text(formData, "name"),
    phone,
    password,
  });
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
  if (!text(formData, "name") || phone.length < 10 || password.length < 6) {
    errorRedirect(`/c/${slug}`, "Заполните имя, телефон и пароль от 6 символов");
  }

  if (formData.get("privacyAccepted") !== "on") {
    errorRedirect(`/c/${slug}`, "Нужно согласие на обработку персональных данных");
  }

  const meta = await requestMeta();
  const settings = await getSettings();
  const user = await getOrCreateUser({
    name: text(formData, "name"),
    phone,
    password,
  });
  await ensureGlobalQrToken(user);

  await joinCompanyProgram(company.id, user.id);

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
  const membership = await joinCompanyProgram(company.id, user.id);
  redirect(`/app/cards/${membership.id}`);
}

export async function confirmPurchase(formData: FormData) {
  const access = await requireCompanyUser();
  const membershipId = text(formData, "membershipId");
  const token = text(formData, "token");
  try {
    await addPurchase(access.companyId, membershipId, access.userId);
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
    errorRedirect(`/company/scan?token=${encodeURIComponent(token)}`, error instanceof Error ? error.message : "Не удалось начислить покупку");
  }
  revalidatePath("/company");
  redirect(`/company/scan?token=${encodeURIComponent(token)}&success=${encodeURIComponent("Начислено")}`);
}

export async function joinScannedCustomerAndConfirmPurchase(formData: FormData) {
  const access = await requireCompanyUser();
  const token = text(formData, "token");
  let membershipIdForLog = "";

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
    await addPurchase(access.companyId, membership.id, access.userId);
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
  redirect(`/company/scan?token=${encodeURIComponent(token)}&success=${encodeURIComponent("Клиент подключён, покупка начислена")}`);
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
    errorRedirect("/app", "Супер-админ не может удалить аккаунт из клиентского кабинета");
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
    errorRedirect("/app", "Аккаунт связан с компанией или операциями. Сначала передайте доступ и обратитесь к администратору сервиса.");
  }

  await getDb().user.delete({ where: { id: user.id } });
  await clearSession();
  redirect("/");
}
