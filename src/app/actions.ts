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
  requireCompanyUser,
  requireSuperadmin,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizePhone, slugify } from "@/lib/format";
import { addPurchase, grantReward, newQrToken } from "@/lib/loyalty";
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
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local",
    userAgent: h.get("user-agent") ?? "unknown",
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

  await createSession(user);
  redirect(`/c/${slug}/app`);
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

  console.log(`[email stub] Заявка компании отправлена: ${company.name} (${company.ownerEmail})`);
  redirect("/company/register?success=1");
}

export async function approveCompany(formData: FormData) {
  const admin = await requireSuperadmin();
  const settings = await getSettings();
  const companyId = text(formData, "companyId");
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

  console.log(`[email stub] Компания подтверждена: ${company.ownerEmail}`);
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

  await getDb().customerMembership.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: {},
    create: {
      companyId: company.id,
      userId: user.id,
      qrToken: newQrToken(),
    },
  });

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
  redirect(`/c/${slug}/app`);
}

export async function confirmPurchase(formData: FormData) {
  const access = await requireCompanyUser();
  const membershipId = text(formData, "membershipId");
  try {
    await addPurchase(access.companyId, membershipId, access.userId);
  } catch (error) {
    errorRedirect(`/company/scan?token=${encodeURIComponent(text(formData, "token"))}`, error instanceof Error ? error.message : "Не удалось начислить покупку");
  }
  revalidatePath("/company");
  redirect(`/company/scan?token=${encodeURIComponent(text(formData, "token"))}&success=${encodeURIComponent("Начислено")}`);
}

export async function giveReward(formData: FormData) {
  const access = await requireCompanyUser();
  const membershipId = text(formData, "membershipId");
  try {
    await grantReward(access.companyId, membershipId, access.userId);
  } catch (error) {
    errorRedirect(`/company/scan?token=${encodeURIComponent(text(formData, "token"))}`, error instanceof Error ? error.message : "Не удалось выдать подарок");
  }
  redirect(`/company/scan?token=${encodeURIComponent(text(formData, "token"))}&success=${encodeURIComponent("Подарок выдан")}`);
}

export async function deleteClient(formData: FormData) {
  const access = await requireCompanyAdmin();
  const membershipId = text(formData, "membershipId");
  await getDb().customerMembership.delete({
    where: { id: membershipId },
  });
  await getDb().auditLog.create({
    data: {
      actorUserId: access.userId,
      companyId: access.companyId,
      action: "CUSTOMER_MEMBERSHIP_DELETED",
      entityType: "CustomerMembership",
      entityId: membershipId,
    },
  });
  redirect("/company/clients");
}
