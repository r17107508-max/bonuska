import { randomUUID } from "node:crypto";
import { PrismaClient, CompanyStatus, CompanyUserRole, GlobalRole, LoyaltyProgramType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const offerText = `Договор-оферта SaaS-сервиса программы лояльности

Внимание: это предварительный шаблон. Перед реальным запуском его должен проверить юрист.

Исполнитель: самозанятый Алиуллов Раиль Фаридович, ИНН 732711876598, телефон 89278370717, email rf173@bk.ru.

1. Предмет договора. Исполнитель предоставляет компании доступ к веб-сервису для ведения цифровой программы лояльности. Сервис предоставляется как есть.
2. Регистрация и акцепт. Компания направляет заявку, принимает оферту чекбоксом в интерфейсе и подтверждает согласие на обработку персональных данных. Акцепт фиксируется в базе с версией оферты, датой, IP и User-Agent.
3. Trial и подписка. После подтверждения заявки предоставляется 14 дней пробного периода. Платный период составляет 30 дней. Стоимость базового тарифа - 499 рублей в месяц.
4. Оплата. До подключения онлайн-эквайринга оплату подтверждает глобальный администратор вручную. Реквизиты хранятся в настройках сервиса.
5. Ограничение доступа. При неоплате, нарушении условий или злоупотреблениях Исполнитель вправе временно ограничить доступ без удаления данных.
6. Акции компаний. Исполнитель не является стороной сделки между компанией и клиентом, не отвечает за законность акций, рекламу, подарки и фактическую выдачу подарков клиентам.
7. Ответственность. Исполнитель не обещает бесперебойную работу 24/7, не отвечает за технические сбои, действия третьих лиц и убытки, связанные с внутренними правилами компаний.
8. Персональные данные. Компания отвечает за законность обработки данных своих клиентов. Сервис применяет разграничение доступа, хэширование паролей и защиту QR-токенов.
9. Возвраты. Оплата за уже предоставленный оплаченный период не возвращается, кроме случаев, прямо предусмотренных законом РФ.
10. Изменения. Исполнитель может менять функциональность сервиса и стоимость тарифа с уведомлением через интерфейс приложения.
11. Расторжение. Компания может прекратить использование сервиса в любой момент. Доступ после окончания оплаченного периода может быть ограничен.
12. Право и споры. Применяется законодательство Российской Федерации. Электронный документооборот через интерфейс приложения признается сторонами достаточным.`;

const privacyText = `Политика обработки персональных данных

Внимание: это предварительный шаблон. Перед запуском нужно проверить текст с юристом и отдельно оценить необходимость уведомления Роскомнадзора как оператора персональных данных.

Сервис обрабатывает данные компаний: название, ФИО представителя, телефон, email, город, адрес точки, ИНН при наличии. Для клиентов компаний обрабатываются имя, телефон, история покупок, QR-токен и принадлежность к компании.

Обработка нужна для регистрации, авторизации, ведения программы лояльности, учета покупок, выдачи подарков, поддержки и защиты от злоупотреблений.

Согласие фиксируется в базе с версией документа, датой, IP и User-Agent. Пароли хэшируются. QR-коды не содержат номер телефона. Доступ к данным разграничен по компаниям: компания не видит клиентов другой компании.

Пользователь может запросить удаление или выгрузку данных. Сервис стремится к минимизации данных и хранит только сведения, необходимые для работы программы лояльности.`;

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
      globalRole,
    },
  });
}

async function main() {
  const [superadmin, companyAdmin, cashier, client] = await Promise.all([
    user({
      name: "Глобальный админ",
      phone: "79990000000",
      email: "admin@example.com",
      password: "admin123",
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
      offerVersion: "1.0",
      offerText,
      privacyVersion: "1.0",
      privacyText,
      paymentRequisites: "Реквизиты задаются владельцем сервиса в суперадминке.",
      supportEmail: "rf173@bk.ru",
    },
    create: {
      id: "default",
      subscriptionPrice: 499,
      trialDays: 14,
      offerVersion: "1.0",
      offerText,
      privacyVersion: "1.0",
      privacyText,
      paymentRequisites: "Реквизиты задаются владельцем сервиса в суперадминке.",
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
