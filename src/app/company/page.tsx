import Link from "next/link";
import QRCode from "qrcode";
import { CompanyUserRole, RaffleStatus } from "@prisma/client";
import { Activity, BarChart3, Bell, CheckCircle2, ChevronDown, Clock3, Gift, Lightbulb, MapPinned, QrCode, ScanLine, Settings, Trophy, UserPlus, Users } from "lucide-react";
import { hideCompanyOnboardingChecklist } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { RegistrationQrPoster } from "@/components/registration-qr-poster";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, formatDateTime, operationLabel, statusClass, statusLabel } from "@/lib/format";
import { loyaltyTemplates } from "@/lib/loyalty-templates";
import { hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";
import { getCompanyRegistrationUrl } from "@/lib/request-url";

export default async function CompanyDashboardPage() {
  const access = await requireCompanyUser();
  const company = await refreshCompanySubscription(access.companyId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeClientSince = new Date(now);
  activeClientSince.setDate(activeClientSince.getDate() - 30);

  const [clientsTotal, activeClients, repeatClients, sleepingClients, operationsToday, operationsMonth, rewardsIssued, staffTotal, recentTransactions, activeRaffle] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, lastActionAt: { gte: activeClientSince } } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 1 } } }),
    getDb().customerMembership.count({
      where: {
        companyId: access.companyId,
        totalPurchases: { gt: 0 },
        OR: [{ lastActionAt: null }, { lastActionAt: { lt: activeClientSince } }],
      },
    }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: { in: ["REWARD_REDEEMED", "REWARD_GRANTED"] } } }),
    getDb().companyUser.count({ where: { companyId: access.companyId, isActive: true } }),
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId },
      include: {
        cashier: { select: { id: true, name: true } },
        membership: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getDb().companyRaffle.findFirst({
      where: {
        companyId: access.companyId,
        status: RaffleStatus.ACTIVE,
        drawAt: { gt: now },
      },
      include: { _count: { select: { tickets: true } } },
      orderBy: [{ participationEndsAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;
  const left = company?.status === "ACTIVE_TRIAL" ? daysLeft(company.trialEndsAt) : daysLeft(company?.paidUntil);
  const isCashier = access.role === CompanyUserRole.CASHIER;
  const repeatRate = clientsTotal > 0 ? Math.round((repeatClients / clientsTotal) * 100) : 0;
  const clientUrl = await getCompanyRegistrationUrl(access.company.slug);
  const qrDataUrl = await QRCode.toDataURL(clientUrl, {
    width: 420,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const setupProgress = [
    { done: Boolean(access.company.loyaltyProgram), label: "Выбрать шаблон акции", href: "/company/settings" },
    { done: true, label: "Получить QR для клиентов", href: "/company/settings#registration-qr" },
    { done: staffTotal > 1, label: "Добавить кассира", href: "/company/staff" },
    { done: clientsTotal > 0, label: "Получить первого клиента", href: "/company/settings#registration-qr" },
    { done: operationsMonth > 0, label: "Сделать первое начисление", href: "/company/scan" },
  ];
  const completedSteps = setupProgress.filter((item) => item.done).length;
  const showSetupChecklist = !access.company.onboardingChecklistHidden && completedSteps < setupProgress.length;
  const recommendations = buildOwnerRecommendations({
    clientsTotal,
    staffTotal,
    operationsMonth,
    sleepingClients,
    repeatRate,
    activeRaffleTitle: activeRaffle?.title ?? null,
    hasCoordinates: typeof access.company.latitude === "number" && typeof access.company.longitude === "number",
    hasActiveAccess: active,
  });

  if (isCashier) {
    return (
      <AdminShell
        title={access.company.name}
        subtitle="Рабочее место кассира."
        nav={companyNavForRole(access.role)}
        cashier={{ companyName: access.company.name, status: statusLabel(company?.status ?? access.company.status) }}
      >
        {!active && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-800">
            Сервис временно недоступен из-за статуса подписки. Обратитесь к администратору компании.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric icon={<Activity aria-hidden className="size-5" />} label="Сегодня" value={operationsToday} description="операций за смену" />
          <Metric icon={<BarChart3 aria-hidden className="size-5" />} label="За месяц" value={operationsMonth} description="начислений и подарков" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Action href="/company/scan" icon={<ScanLine aria-hidden className="size-6" />} title="Сканировать QR" text="Главное действие кассира: открыть камеру и подтвердить операцию." emphasis />
          <div className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Как работать</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. Попросите клиента показать QR.</li>
              <li>2. Отсканируйте код или введите токен вручную.</li>
              <li>3. Нажмите одну кнопку: начислить покупку или выдать подарок.</li>
            </ol>
          </div>
        </div>
        <section className="panel mt-6 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Последние операции</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{operationLabel(transaction.type)}</p>
                  <p className="text-slate-500">
                    {transaction.membership.user.name} · {transaction.type === "REWARD_OPENED" ? "открыл клиент" : `кассир: ${transaction.cashier.name}`}
                  </p>
                </div>
                <p className="font-medium text-slate-500 sm:text-right">{formatDateTime(transaction.createdAt)}</p>
              </div>
            ))}
            {recentTransactions.length === 0 && <p className="p-4 text-sm text-slate-500">Операций пока нет.</p>}
          </div>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={access.company.name} subtitle="Панель запуска программы лояльности, QR для клиентов и статистика." nav={companyNavForRole(access.role)}>
      {!active && (
        <SubscriptionNotice
          tone="danger"
          title="Нужна оплата подписки"
          text="Данные клиентов и история сохранены. После подтверждения оплаты сканер и начисления снова откроются."
          href="/company/billing"
          action="Перейти к оплате"
        />
      )}

      {active && company?.status === "ACTIVE_TRIAL" && left <= 3 && (
        <SubscriptionNotice
          tone="warning"
          title={`Trial заканчивается через ${left} дн.`}
          text="Оплатите подписку заранее, чтобы кассиры не потеряли доступ к начислениям после окончания trial."
          href="/company/billing"
          action="Продлить доступ"
        />
      )}

      {active && company?.status === "ACTIVE_TRIAL" && left > 3 && (
        <SubscriptionNotice
          tone="success"
          title={`Trial активен. Осталось дней: ${left}`}
          text="Распечатайте QR, поставьте его на стойку и сделайте первое тестовое начисление."
          href="/company/settings#registration-qr"
          action="Распечатать QR"
        />
      )}

      {showSetupChecklist && (
        <section className="panel mb-6 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-[var(--brand)]">Первый запуск</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Чек-лист запуска: {completedSteps}/{setupProgress.length}</h2>
              <p className="mt-2 text-slate-600">Выполните эти шаги, чтобы за trial получить первых клиентов и понять ценность сервиса.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/company/settings#registration-qr" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 font-semibold text-white">
                <QrCode aria-hidden className="size-5" />
                Распечатать QR
              </Link>
              <form action={hideCompanyOnboardingChecklist}>
                <button type="submit" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700">
                  Скрыть чек-лист
                </button>
              </form>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {setupProgress.map((item) => (
              <Link key={item.label} href={item.href} className={`rounded-lg border p-3 text-sm font-semibold ${item.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
                <CheckCircle2 aria-hidden className={`mb-2 size-5 ${item.done ? "text-emerald-700" : "text-slate-300"}`} />
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card p-5">
          <p className="text-sm font-semibold text-[var(--text-muted)]">Статус подписки</p>
          <p className="mt-3"><span className={`badge ${statusClass(company?.status ?? access.company.status)}`}>{statusLabel(company?.status ?? access.company.status)}</span></p>
        </div>
        <Metric icon={<Clock3 aria-hidden className="size-5" />} label="Дней осталось" value={left} description="до оплаты или конца trial" />
        <Metric icon={<Users aria-hidden className="size-5" />} label="Клиентов всего" value={clientsTotal} description={clientsTotal > 0 ? "людей в программе" : "пока нет данных"} />
        <Metric icon={<Activity aria-hidden className="size-5" />} label="Операций сегодня" value={operationsToday} description={operationsToday > 0 ? "работа идёт" : "пока нет данных"} />
        <Metric icon={<BarChart3 aria-hidden className="size-5" />} label="Операций за месяц" value={operationsMonth} description={operationsMonth > 0 ? "за текущий месяц" : "пока нет данных"} />
        <Metric icon={<Trophy aria-hidden className="size-5" />} label="Подарков выдано" value={rewardsIssued} description={rewardsIssued > 0 ? "за всё время" : "пока нет данных"} />
        <Metric icon={<UserPlus aria-hidden className="size-5" />} label="Активных клиентов" value={activeClients} description="за последние 30 дней" />
        <Metric icon={<Users aria-hidden className="size-5" />} label="Повторных клиентов" value={`${repeatRate}%`} description={`${repeatClients} вернулись за покупкой`} />
        <Metric icon={<Clock3 aria-hidden className="size-5" />} label="Спящих клиентов" value={sleepingClients} description="не было покупок 30 дней" />
      </div>

      <section className="panel mt-6 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--brand)]">Что сделать дальше</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">Рекомендации для роста</h2>
            <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">
              Простые следующие шаги по текущим данным компании.
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[rgba(255,200,87,0.25)] px-3 text-sm font-bold text-[#7a4b00]">
            <Lightbulb aria-hidden className="size-4" />
            {recommendations.length} совета
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.title} recommendation={recommendation} />
          ))}
        </div>
      </section>

      <div className="mt-6">
        <Action href="/company/scan" icon={<ScanLine aria-hidden className="size-6" />} title="Сканировать QR" text="Быстрый переход к начислению покупки или выдаче подарка." emphasis />
      </div>

      <div className="mt-6 space-y-3">
        <AccordionSection
          icon={<QrCode aria-hidden className="size-5" />}
          title="QR для клиентов"
          description="Плакат, ссылка и регистрация новых клиентов."
        >
          {clientUrl && qrDataUrl ? (
            <RegistrationQrPoster
              companyName={access.company.name}
              clientUrl={clientUrl}
              qrDataUrl={qrDataUrl}
              rewardTitle={access.company.loyaltyProgram?.rewardTitle}
            />
          ) : (
            <EmptyState text="QR будет доступен после сохранения основных настроек компании." />
          )}
        </AccordionSection>

        <AccordionSection
          icon={<Users aria-hidden className="size-5" />}
          title="Клиенты"
          description={`${clientsTotal} всего, ${activeClients} активных за 30 дней.`}
        >
          <SectionAction href="/company/clients" title="Открыть список клиентов" text="Поиск, карточки клиентов, история и прогресс." />
        </AccordionSection>

        <AccordionSection
          icon={<UserPlus aria-hidden className="size-5" />}
          title="Кассиры"
          description={`${staffTotal} активных сотрудников в компании.`}
        >
          <SectionAction href="/company/staff" title="Управлять кассирами" text="Добавить сотрудника, изменить роль или отключить доступ." />
        </AccordionSection>

        <AccordionSection
          icon={<Trophy aria-hidden className="size-5" />}
          title="Розыгрыши"
          description={activeRaffle ? `${activeRaffle.title}: ${activeRaffle._count.tickets} участников.` : "Создание акций с розыгрышем призов."}
        >
          <SectionAction href="/company/raffles" title="Открыть розыгрыши" text="Создать розыгрыш, посмотреть участников и зафиксировать победителей." />
        </AccordionSection>

        <AccordionSection
          icon={<Settings aria-hidden className="size-5" />}
          title="Настройки акции"
          description="Шаблоны, подарки, цвет, адрес и параметры программы."
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Быстрые шаблоны</h3>
              <p className="mt-1 text-sm text-slate-600">Выберите готовый сценарий или откройте полные настройки.</p>
            </div>
            <Link href="/company/settings" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white">
              Все настройки
            </Link>
          </div>
          {loyaltyTemplates.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {loyaltyTemplates.slice(0, 6).map((template) => (
                <Link key={template.id} href={`/company/settings?template=${template.id}`} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-3xl">{template.icon}</span>
                    <Gift aria-hidden className="size-5 text-[var(--brand)]" />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-950">{template.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{template.goalCount} покупок · {template.rewardTitle}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="Шаблонов пока нет. Откройте полные настройки акции." />
          )}
        </AccordionSection>

        <AccordionSection
          icon={<BarChart3 aria-hidden className="size-5" />}
          title="Статистика"
          description={`${operationsMonth} операций за месяц, ${rewardsIssued} подарков выдано.`}
        >
          <SectionAction href="/company/reports" title="Открыть отчёты" text="Клиенты, покупки, подарки, кассиры и подозрительные операции." />
          {recentTransactions.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{operationLabel(transaction.type)}</p>
                    <p className="text-slate-500">
                      {transaction.membership.user.name} · {transaction.type === "REWARD_OPENED" ? "открыл клиент" : `кассир: ${transaction.cashier.name}`}
                    </p>
                  </div>
                  <p className="font-medium text-slate-500 sm:text-right">{formatDateTime(transaction.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Операций пока нет. После первых сканирований здесь появится история." />
          )}
        </AccordionSection>

        <AccordionSection
          icon={<Bell aria-hidden className="size-5" />}
          title="Уведомления и оплата"
          description="Статус подписки, продление доступа и служебные напоминания."
        >
          <SectionAction href="/company/billing" title="Открыть оплату" text="Продление подписки и текущий статус доступа." />
        </AccordionSection>
      </div>
    </AdminShell>
  );
}

function Metric({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="stat-card p-5">
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--text-muted)]">{label}</p>
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-[var(--brand)] shadow-sm ring-1 ring-[var(--border)]">{icon}</span>
        </div>
        <p className="mt-3 text-3xl font-semibold text-[var(--text)]">{value}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );
}

type OwnerRecommendation = {
  title: string;
  text: string;
  href: string;
  action: string;
  icon: React.ReactNode;
  tone: "green" | "amber" | "blue";
};

function buildOwnerRecommendations({
  clientsTotal,
  staffTotal,
  operationsMonth,
  sleepingClients,
  repeatRate,
  activeRaffleTitle,
  hasCoordinates,
  hasActiveAccess,
}: {
  clientsTotal: number;
  staffTotal: number;
  operationsMonth: number;
  sleepingClients: number;
  repeatRate: number;
  activeRaffleTitle: string | null;
  hasCoordinates: boolean;
  hasActiveAccess: boolean;
}) {
  const items: OwnerRecommendation[] = [];

  if (!hasActiveAccess) {
    items.push({
      title: "Верните доступ кассирам",
      text: "Подписка не активна. После оплаты сканер снова сможет начислять покупки и выдавать подарки.",
      href: "/company/billing",
      action: "Открыть оплату",
      icon: <Bell aria-hidden className="size-5" />,
      tone: "amber",
    });
  }

  if (clientsTotal === 0) {
    items.push({
      title: "Поставьте QR на стойку",
      text: "Первый клиент появится быстрее, если QR-плакат лежит рядом с кассой и понятна выгода.",
      href: "/company/settings#registration-qr",
      action: "Распечатать QR",
      icon: <QrCode aria-hidden className="size-5" />,
      tone: "green",
    });
  }

  if (staffTotal <= 1) {
    items.push({
      title: "Добавьте кассира",
      text: "Отдельный доступ кассира снижает риск ошибок и помогает видеть, кто проводил операции.",
      href: "/company/staff",
      action: "Добавить сотрудника",
      icon: <UserPlus aria-hidden className="size-5" />,
      tone: "blue",
    });
  }

  if (operationsMonth === 0) {
    items.push({
      title: "Сделайте тестовое начисление",
      text: "Проверьте рабочий сценарий: QR клиента, подтверждение покупки и обновление прогресса.",
      href: "/company/scan",
      action: "Открыть сканер",
      icon: <ScanLine aria-hidden className="size-5" />,
      tone: "green",
    });
  }

  if (sleepingClients > 0) {
    items.push({
      title: "Верните спящих клиентов",
      text: `${sleepingClients} клиентов давно не покупали. Посмотрите список и запустите ручное возвращение через привычный канал связи.`,
      href: "/company/reports",
      action: "Открыть отчёты",
      icon: <Clock3 aria-hidden className="size-5" />,
      tone: "amber",
    });
  }

  if (clientsTotal >= 5 && repeatRate < 30) {
    items.push({
      title: "Усильте повторные покупки",
      text: `Повторных клиентов сейчас ${repeatRate}%. Проверьте, достаточно ли заметна награда и понятны ли правила акции.`,
      href: "/company/settings",
      action: "Проверить акцию",
      icon: <BarChart3 aria-hidden className="size-5" />,
      tone: "blue",
    });
  }

  if (!activeRaffleTitle && clientsTotal > 0) {
    items.push({
      title: "Добавьте повод вернуться",
      text: "Розыгрыш по чекам помогает оживить базу без сложных кампаний и новой логики бонусов.",
      href: "/company/raffles",
      action: "Создать розыгрыш",
      icon: <Trophy aria-hidden className="size-5" />,
      tone: "amber",
    });
  }

  if (!hasCoordinates) {
    items.push({
      title: "Укажите точку на карте",
      text: "Координаты помогут клиентам найти компанию в разделе партнёров и построить маршрут.",
      href: "/company/settings#map",
      action: "Открыть настройки",
      icon: <MapPinned aria-hidden className="size-5" />,
      tone: "blue",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Проверьте отчёты недели",
      text: "Посмотрите активных, повторных и близких к подарку клиентов, чтобы выбрать следующую акцию.",
      href: "/company/reports",
      action: "Открыть отчёты",
      icon: <BarChart3 aria-hidden className="size-5" />,
      tone: "green",
    });
  }

  return items.slice(0, 4);
}

function RecommendationCard({ recommendation }: { recommendation: OwnerRecommendation }) {
  const styles = {
    green: "bg-[var(--brand-soft)] text-[var(--brand)]",
    amber: "bg-[rgba(255,200,87,0.25)] text-[#7a4b00]",
    blue: "bg-blue-50 text-blue-800",
  };

  return (
    <Link href={recommendation.href} className="rounded-lg border border-[var(--border)] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${styles[recommendation.tone]}`}>
          {recommendation.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--text)]">{recommendation.title}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{recommendation.text}</p>
          <span className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-[var(--brand)] px-3 text-sm font-bold text-white">
            {recommendation.action}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Action({ href, icon, title, text, emphasis = false }: { href: string; icon: React.ReactNode; title: string; text: string; emphasis?: boolean }) {
  return (
    <Link
      href={href}
      className={`panel block p-5 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(255,106,61,0.25)] ${
        emphasis ? "border-2 border-[var(--brand)] bg-white shadow-[0_18px_46px_rgba(21,128,61,0.14)]" : ""
      }`}
    >
      <div className={`flex size-12 items-center justify-center rounded-lg ${emphasis ? "bg-[var(--brand-soft)] text-[var(--brand-ink)] ring-1 ring-[rgba(255,106,61,0.25)]" : "bg-[var(--brand-soft)] text-[var(--brand)]"}`}>{icon}</div>
      <h2 className="mt-4 text-xl font-semibold text-[var(--text)]">{title}</h2>
      <p className={`mt-2 ${emphasis ? "text-[var(--text)]" : "text-slate-600"}`}>{text}</p>
    </Link>
  );
}

function AccordionSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-[var(--border)] bg-white shadow-[0_16px_40px_rgba(92,53,33,0.08)]">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[var(--text)]">{title}</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--border)] p-4">{children}</div>
    </details>
  );
}

function SectionAction({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
      <span>
        <span className="block font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-sm text-slate-600">{text}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-[var(--brand)]">Открыть</span>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      {text}
    </div>
  );
}

function SubscriptionNotice({
  tone,
  title,
  text,
  href,
  action,
}: {
  tone: "success" | "warning" | "danger";
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  const styles = {
    success: "bg-emerald-50 text-emerald-900",
    warning: "bg-[var(--inactive)] text-[#5f3a00]",
    danger: "bg-red-50 text-red-900",
  };

  return (
    <div className={`mb-5 flex flex-col justify-between gap-4 rounded-lg p-4 font-semibold sm:flex-row sm:items-center ${styles[tone]}`}>
      <div>
        <p>{title}</p>
        <p className="mt-1 text-sm font-medium opacity-80">{text}</p>
      </div>
      <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm">
        {action}
      </Link>
    </div>
  );
}
