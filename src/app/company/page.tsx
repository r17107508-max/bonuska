import Image from "next/image";
import Link from "next/link";
import { CompanyUserRole, LoyaltyTransactionType } from "@prisma/client";
import { CheckCircle2, ScanLine } from "lucide-react";
import { hideCompanyOnboardingChecklist } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { KpiCard, SegmentedLinks, SimpleBars, StatusPill, WorkspaceCard } from "@/components/company-ui";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, formatDateTime, operationLabel, statusClass, statusLabel } from "@/lib/format";
import { hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";

type Period = "7" | "30" | "90";

export default async function CompanyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; success?: string; error?: string }>;
}) {
  const access = await requireCompanyUser();
  const params = await searchParams;
  const period = ["7", "30", "90"].includes(params.period ?? "") ? params.period as Period : "30";
  const company = await refreshCompanySubscription(access.companyId);
  const isCashier = access.role === CompanyUserRole.CASHIER;
  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;
  const left = company?.status === "ACTIVE_TRIAL" ? daysLeft(company.trialEndsAt) : daysLeft(company?.paidUntil);
  const last30Start = daysAgo(30);
  const chartStart = daysAgo(Number(period) - 1);

  const [
    clientsTotal,
    repeatClients,
    purchases30Aggregate,
    rewardsIssued,
    staffTotal,
    transactionsForChart,
    recentTransactions,
  ] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 1 } } }),
    getDb().loyaltyTransaction.aggregate({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: last30Start } }, _sum: { quantity: true } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: { in: ["REWARD_REDEEMED", "REWARD_GRANTED"] } } }),
    getDb().companyUser.count({ where: { companyId: access.companyId, isActive: true } }),
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId, createdAt: { gte: chartStart }, type: { in: ["PURCHASE", "REWARD_REDEEMED", "REWARD_GRANTED"] } },
      select: { type: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId },
      include: {
        cashier: { select: { id: true, name: true } },
        membership: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const purchases30 = purchases30Aggregate._sum.quantity ?? 0;
  const chartPoints = buildChartPoints(Number(period), transactionsForChart);
  const setupProgress = [
    { done: Boolean(access.company.loyaltyProgram), label: "Выбрать шаблон программы", href: "/company/settings#program" },
    { done: Boolean(access.company.loyaltyProgram?.rewardTitle), label: "Настроить подарок", href: "/company/settings#program" },
    { done: true, label: "Скачать QR-плакат", href: "/company/settings#registration-qr" },
    { done: staffTotal > 1, label: "Добавить кассира", href: "/company/staff" },
    { done: purchases30 > 0, label: "Выполнить тестовое начисление", href: "/company/scan" },
  ];
  const completedSteps = setupProgress.filter((item) => item.done).length;
  const showSetupChecklist = !isCashier && !access.company.onboardingChecklistHidden && completedSteps < setupProgress.length;

  if (isCashier) {
    return (
      <AdminShell
        title={access.company.name}
        subtitle="Рабочее место кассира для сканирования QR и просмотра клиентов."
        nav={companyNavForRole(access.role)}
        cashier={{ companyName: access.company.name, status: statusLabel(company?.status ?? access.company.status) }}
      >
        {!active && (
          <WorkspaceCard className="mb-5 border-red-200 bg-red-50 text-[var(--danger)]">
            <p className="font-bold">Сканер временно недоступен из-за статуса подписки. Обратитесь к администратору компании.</p>
          </WorkspaceCard>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label="Покупок за 30 дней" value={purchases30} />
          <KpiCard label="Подарков выдано" value={rewardsIssued} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <QuickAction href="/company/scan" title="Сканировать QR" text="Открыть камеру и подтвердить покупку или подарок." primary />
          <RecentOperations transactions={recentTransactions} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={access.company.name} subtitle="Управление QR-программой лояльности, клиентами, сотрудниками и оплатой." nav={companyNavForRole(access.role)}>
      {params.success && <Toast tone="success" text={params.success} />}
      {params.error && <Toast tone="danger" text={params.error} />}

      <WorkspaceCard className="mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold text-[var(--text)]">{access.company.name}</h2>
              <span className={`badge ${statusClass(company?.status ?? access.company.status)}`}>{statusLabel(company?.status ?? access.company.status)}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{access.company.address || access.company.city || "Точка или филиал не указаны"}</p>
          </div>
          <Link href="/company/scan" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white">
            <ScanLine aria-hidden className="size-5" />
            Сканировать QR
          </Link>
        </div>

        {active && company?.status === "ACTIVE_TRIAL" && left <= 3 && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold">Пробный период закончится через {left === 1 ? "1 день" : `${left} дн.`}</p>
            <Link href="/company/billing" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-bold text-amber-950 ring-1 ring-amber-200">
              Продлить доступ
            </Link>
          </div>
        )}
      </WorkspaceCard>

      {showSetupChecklist && (
        <details open className="panel mb-5 overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-bold uppercase text-[var(--brand-strong)]">Первый запуск</p>
              <h2 className="mt-1 text-2xl font-extrabold text-[var(--text)]">Чек-лист запуска: {completedSteps}/{setupProgress.length}</h2>
            </div>
            <StatusPill tone="brand">{Math.round((completedSteps / setupProgress.length) * 100)}%</StatusPill>
          </summary>
          <div className="grid gap-5 border-t border-[var(--border)] p-5 lg:grid-cols-[1fr_220px] lg:items-center">
            <div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--inactive)]">
                <div className="h-full rounded-full bg-[var(--brand-strong)]" style={{ width: `${(completedSteps / setupProgress.length) * 100}%` }} />
              </div>
              <div className="grid gap-2">
                {setupProgress.map((item) => (
                  <Link key={item.label} href={item.href} className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]">
                    <CheckCircle2 aria-hidden className={`size-5 ${item.done ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`} />
                    {item.label}
                  </Link>
                ))}
              </div>
              <form action={hideCompanyOnboardingChecklist} className="mt-4">
                <button type="submit" className="min-h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text-muted)]">
                  Свернуть чек-лист
                </button>
              </form>
            </div>
            <Image
              src="/images/company/company-onboarding.webp"
              alt="Запуск QR-программы лояльности"
              width={220}
              height={165}
              loading="lazy"
              className="mx-auto h-auto w-full max-w-[220px] lg:order-last"
            />
          </div>
        </details>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Клиентов всего" value={clientsTotal} />
        <KpiCard label="Повторных клиентов" value={repeatClients} hint={clientsTotal ? `${Math.round((repeatClients / clientsTotal) * 100)}% базы` : "пока нет данных"} />
        <KpiCard label="Покупок за 30 дней" value={purchases30} />
        <KpiCard label="Подарков выдано" value={rewardsIssued} />
      </div>

      <WorkspaceCard className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text)]">Покупки и подарки</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Динамика по реальным операциям за выбранный период.</p>
          </div>
          <SegmentedLinks
            active={period}
            items={[
              { value: "7", label: "7 дней", href: "/company?period=7" },
              { value: "30", label: "30 дней", href: "/company?period=30" },
              { value: "90", label: "90 дней", href: "/company?period=90" },
            ]}
          />
        </div>
        <div className="mt-4">
          <SimpleBars points={chartPoints} leftLabel="Покупки" rightLabel="Подарки" />
        </div>
      </WorkspaceCard>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction href="/company/scan" title="Сканировать QR" text="Начислить покупку или выдать подарок." primary />
        <QuickAction href="/company/settings#registration-qr" title="Открыть QR-плакат" text="Ссылка и плакат для регистрации клиентов." />
        <QuickAction href="/company/staff" title="Добавить сотрудника" text="Кассир или администратор компании." />
        <QuickAction href="/company/settings#program" title="Настроить программу" text="Тип, подарок, цвет и карточка клиента." />
      </div>

      <div className="mt-5">
        <RecentOperations transactions={recentTransactions} />
      </div>
    </AdminShell>
  );
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function buildChartPoints(
  days: number,
  transactions: { type: LoyaltyTransactionType; quantity: number; createdAt: Date }[],
) {
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" });
  const points = Array.from({ length: days }, (_, index) => {
    const date = daysAgo(days - 1 - index);
    const key = date.toISOString().slice(0, 10);
    return { key, label: formatter.format(date), purchases: 0, rewards: 0 };
  });
  const byKey = new Map(points.map((point) => [point.key, point]));

  for (const transaction of transactions) {
    const point = byKey.get(transaction.createdAt.toISOString().slice(0, 10));
    if (!point) continue;
    if (transaction.type === "PURCHASE") point.purchases += transaction.quantity;
    if (transaction.type === "REWARD_REDEEMED" || transaction.type === "REWARD_GRANTED") point.rewards += 1;
  }

  return points.map(({ label, purchases, rewards }) => ({ label, purchases, rewards }));
}

function QuickAction({ href, title, text, primary = false }: { href: string; title: string; text: string; primary?: boolean }) {
  return (
    <Link href={href} className={`panel block p-4 transition hover:-translate-y-0.5 ${primary ? "border-[var(--brand-strong)] bg-[var(--brand-soft)]" : ""}`}>
      <span className="mt-1 block font-extrabold text-[var(--text)]">{title}</span>
      <span className="mt-1 block text-sm text-[var(--text-muted)]">{text}</span>
    </Link>
  );
}

function RecentOperations({
  transactions,
}: {
  transactions: {
    id: string;
    type: LoyaltyTransactionType;
    quantity: number;
    createdAt: Date;
    cashier: { name: string };
    membership: { user: { name: string } };
  }[];
}) {
  return (
    <WorkspaceCard>
      <h2 className="text-xl font-extrabold text-[var(--text)]">Последние операции</h2>
      <div className="mt-3 divide-y divide-[var(--border)]">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-bold text-[var(--text)]">
                {operationLabel(transaction.type)}
                {transaction.type === "PURCHASE" && transaction.quantity > 1 ? ` +${transaction.quantity}` : ""}
              </p>
              <p className="text-[var(--text-muted)]">{transaction.membership.user.name} · кассир: {transaction.cashier.name}</p>
            </div>
            <p className="font-semibold text-[var(--text-muted)] sm:text-right">{formatDateTime(transaction.createdAt)}</p>
          </div>
        ))}
        {transactions.length === 0 && <p className="py-3 text-sm text-[var(--text-muted)]">Операций пока нет.</p>}
      </div>
    </WorkspaceCard>
  );
}

function Toast({ tone, text }: { tone: "success" | "danger"; text: string }) {
  return (
    <div className={`mb-4 rounded-2xl p-3 text-sm font-bold ${tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-[var(--danger)]"}`}>
      {text}
    </div>
  );
}
