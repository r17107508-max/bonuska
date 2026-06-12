import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, CompanyStatus, CompanyUserRole, GlobalRole, LoyaltyProgramType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const serviceDocuments = JSON.parse(readFileSync(new URL("../src/lib/service-documents.json", import.meta.url), "utf8"));
const offerText = serviceDocuments.offerText;
const privacyText = serviceDocuments.privacyText;

async function user({ name, phone, email, password, globalRole = GlobalRole.USER }) {
  return prisma.user.upsert({
    where: { phone },
    update: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      globalRole,
    },
    create: {
      name,
      phone,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      globalQrToken: randomUUID(),
      globalRole,
    },
  });
}

async function main() {
  const [superadmin, companyAdmin, cashier, client] = await Promise.all([
    user({
      name: "Глобальный админ",
      phone: "79176154920",
      email: "admin@example.com",
      password: "grUpPGSmz2111",
      globalRole: GlobalRole.SUPERADMIN,
    }),
    user({
      name: "Админ ТЕГА",
      phone: "79991111111",
      email: "owner@tega.local",
      password: "company123",
    }),
    user({
      name: "Кассир ТЕГА",
      phone: "79992222222",
      email: "cashier@tega.local",
      password: "cashier123",
    }),
    user({
      name: "Иван",
      phone: "79993333333",
      email: "ivan@example.com",
      password: "client123",
    }),
  ]);

  await prisma.serviceSettings.upsert({
    where: { id: "default" },
    update: {
      subscriptionPrice: 499,
      trialDays: 14,
      offerVersion: serviceDocuments.offerVersion,
      offerText,
      privacyVersion: serviceDocuments.privacyVersion,
      privacyText,
      paymentRequisites: serviceDocuments.paymentRequisites,
      supportEmail: "rf173@bk.ru",
    },
    create: {
      id: "default",
      subscriptionPrice: 499,
      trialDays: 14,
      offerVersion: serviceDocuments.offerVersion,
      offerText,
      privacyVersion: serviceDocuments.privacyVersion,
      privacyText,
      paymentRequisites: serviceDocuments.paymentRequisites,
      supportEmail: "rf173@bk.ru",
    },
  });

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const company = await prisma.company.upsert({
    where: { slug: "tega" },
    update: {
      name: "ТЕГА",
      businessType: "Кофейня",
      city: "Ульяновск",
      address: "Тестовая точка",
      ownerName: "Админ ТЕГА",
      ownerPhone: companyAdmin.phone,
      ownerEmail: companyAdmin.email ?? "owner@tega.local",
      status: CompanyStatus.ACTIVE_TRIAL,
      trialStartedAt: now,
      trialEndsAt,
      icon: "☕",
      themeColor: "#0f766e",
    },
    create: {
      name: "ТЕГА",
      slug: "tega",
      description: "Тестовая кофейня с цифровой бонусной картой.",
      businessType: "Кофейня",
      city: "Ульяновск",
      address: "Тестовая точка",
      ownerName: "Админ ТЕГА",
      ownerPhone: companyAdmin.phone,
      ownerEmail: companyAdmin.email ?? "owner@tega.local",
      status: CompanyStatus.ACTIVE_TRIAL,
      trialStartedAt: now,
      trialEndsAt,
      icon: "☕",
      themeColor: "#0f766e",
    },
  });

  await prisma.companyUser.upsert({
    where: { companyId_userId: { companyId: company.id, userId: companyAdmin.id } },
    update: { role: CompanyUserRole.COMPANY_ADMIN, isActive: true },
    create: { companyId: company.id, userId: companyAdmin.id, role: CompanyUserRole.COMPANY_ADMIN },
  });

  await prisma.companyUser.upsert({
    where: { companyId_userId: { companyId: company.id, userId: cashier.id } },
    update: { role: CompanyUserRole.CASHIER, isActive: true },
    create: { companyId: company.id, userId: cashier.id, role: CompanyUserRole.CASHIER },
  });

  await prisma.loyaltyProgram.upsert({
    where: { companyId: company.id },
    update: {
      programType: LoyaltyProgramType.CLASSIC_REWARD,
      icon: "☕",
      goalCount: 6,
      rewardTitle: "7-й кофе бесплатно",
      rewardDescription: "Купите 6 кофе, следующий получите в подарок.",
      themeColor: "#0f766e",
    },
    create: {
      companyId: company.id,
      programType: LoyaltyProgramType.CLASSIC_REWARD,
      icon: "☕",
      goalCount: 6,
      rewardTitle: "7-й кофе бесплатно",
      rewardDescription: "Купите 6 кофе, следующий получите в подарок.",
      themeColor: "#0f766e",
    },
  });

  await prisma.customerMembership.upsert({
    where: { companyId_userId: { companyId: company.id, userId: client.id } },
    update: {},
    create: {
      companyId: company.id,
      userId: client.id,
      qrToken: randomUUID(),
      currentCount: 3,
      totalPurchases: 3,
    },
  });

  await prisma.giftOption.deleteMany({ where: { companyId: company.id } });
  await prisma.giftOption.createMany({
    data: [
      { companyId: company.id, title: "Кофе", description: "Любой малый кофе" },
      { companyId: company.id, title: "Скидка 10%", description: "На следующий заказ" },
      { companyId: company.id, title: "Сироп бесплатно", description: "Добавка к напитку" },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: superadmin.id,
      companyId: company.id,
      action: "SEED_CREATED",
      entityType: "Company",
      entityId: company.id,
      metadataJson: JSON.stringify({ slug: company.slug }),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
