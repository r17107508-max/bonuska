import Link from "next/link";
import { LoyaltyTransactionType, type AuditLog, type User } from "@prisma/client";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { EmptyCompanyState, KpiCard, maskPhone, SegmentedLinks, SimpleBars, WorkspaceCard } from "@/components/company-ui";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

type Period = "7" | "30" | "90";
type Tab = "overview" | "clients" | "purchases" | "rewards" | "cashiers" | "security";
type SuspiciousLog = AuditLog & { actor: Pick<User, "id" | "name"> | null };

export default async function CompanyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const params = await searchParams;
  const period = ["7", "30", "90"].includes(params.period ?? "") ? params.period as Period : "30";
  const tab = ["overview", "clients", "purchases", "rewards", "cashiers", "security"].includes(params.tab ?? "") ? params.tab as Tab : "overview";
  const now = new Date();
  const periodStart = daysAgo(Number(period) - 1);
  const sleepingStart = daysAgo(30);
  const program = access.company.loyaltyProgram;
  const nearRewardStart = Math.max((program?.goalCount ?? 6) - 1, 1);

  const [
    totalOperations,
    clientsTotal,
    newClients,
    repeatClients,
    activeClientTransactions,
    transactions,
    rewardClaims,
    rewardReadyClients,
    nearRewardClients,
    sleepingClients,
    topClients,
    suspiciousLogs,
  ] = await Promise.all([
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, createdAt: { gte: periodStart } } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 1 } } }),
    getDb().loyaltyTransaction.findMany({ where: { companyId: access.companyId, createdAt: { gte: periodStart } }, select: { membershipId: true } }),
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId, createdAt: { gte: periodStart } },
      include: {
        cashier: { select: { id: true, name: true } },
        membership: { include: { user: { select: { id: true, name: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    getDb().rewardClaim.findMany({
      where: { companyId: access.companyId, createdAt: { gte: periodStart } },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        redeemedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, rewardAvailable: true } }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId, rewardAvailable: false, currentCount: { gte: nearRewardStart } },
      include: { user: true },
      orderBy: { currentCount: "desc" },
      take: 10,
    }),
    getDb().customerMembership.findMany({
      where: {
        companyId: access.companyId,
        totalPurchases: { gt: 0 },
        OR: [{ lastActionAt: null }, { lastActionAt: { lt: sleepingStart } }],
      },
      include: { user: true },
      orderBy: [{ lastActionAt: "asc" }, { createdAt: "asc" }],
      take: 10,
    }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId },
      include: { user: true },
      orderBy: { totalPurchases: "desc" },
      take: 10,
    }),
    getDb().auditLog.findMany({
      where: { companyId: access.companyId, action: "SUSPICIOUS_REPEAT_PURCHASE", createdAt: { gte: periodStart } },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const purchases = transactions.filter((transaction) => transaction.type === "PURCHASE").reduce((sum, transaction) => sum + transaction.quantity, 0);
  const rewardsIssued = transactions.filter((transaction) => transaction.type === "REWARD_REDEEMED" || transaction.type === "REWARD_GRANTED").length;
  const activeClients = new Set(activeClientTransactions.map((transaction) => transaction.membershipId)).size;
  const repeatRate = clientsTotal > 0 ? Math.round((repeatClients / clientsTotal) * 100) : 0;
  const chartPoints = buildChartPoints(Number(period), transactions);
  const cashierStats = buildCashierStats(transactions);

  return (
    <AdminShell title="Отчёты" subtitle="Клиенты, покупки, подарки, кассиры и безопасность по реальным операциям." nav={companyNav}>
      <WorkspaceCard className="mb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text)]">Период отчёта</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{formatDate(periodStart)} - {formatDate(now)}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedLinks
              active={period}
              items={[
                { value: "7", label: "7 дней", href: `/company/reports?period=7&tab=${tab}` },
                { value: "30", label: "30 дней", href: `/company/reports?period=30&tab=${tab}` },
                { value: "90", label: "90 дней", href: `/company/reports?period=90&tab=${tab}` },
              ]}
            />
            {totalOperations > 0 && (
              <Link href="/api/company/reports" target="_blank" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--text)]">
                Экспорт JSON
              </Link>
            )}
          </div>
        </div>
      </WorkspaceCard>

      {totalOperations === 0 ? (
        <EmptyCompanyState
          image="empty-analytics"
          alt="Пустая аналитика"
          title="Данные появятся после первых операций"
          text="Как только кассиры начнут начислять покупки или выдавать подарки, здесь появятся показатели и графики."
          actionHref="/company/scan"
          actionLabel="Открыть сканер"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Клиенты" value={clientsTotal} />
            <KpiCard label="Новые клиенты" value={newClients} />
            <KpiCard label="Повторные клиенты" value={`${repeatRate}%`} hint={`${repeatClients} с 2+ покупками`} />
            <KpiCard label="Покупки" value={purchases} />
            <KpiCard label="Выданные подарки" value={rewardsIssued} />
            <KpiCard label="Активные клиенты" value={activeClients} hint="были операции в периоде" />
          </div>

          <div className="mt-5">
            <SegmentedLinks
              active={tab}
              items={[
                { value: "overview", label: "Обзор", href: `/company/reports?period=${period}&tab=overview` },
                { value: "clients", label: "Клиенты", href: `/company/reports?period=${period}&tab=clients` },
                { value: "purchases", label: "Покупки", href: `/company/reports?period=${period}&tab=purchases` },
                { value: "rewards", label: "Подарки", href: `/company/reports?period=${period}&tab=rewards` },
                { value: "cashiers", label: "Кассиры", href: `/company/reports?period=${period}&tab=cashiers` },
                { value: "security", label: "Безопасность", href: `/company/reports?period=${period}&tab=security` },
              ]}
            />
          </div>

          {tab === "overview" && (
            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
              <WorkspaceCard>
                <h2 className="text-2xl font-extrabold text-[var(--text)]">Покупки и подарки</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Покупки считаются по quantity, подарки - по факту выдачи.</p>
                <div className="mt-4">
                  <SimpleBars points={chartPoints} leftLabel="Покупки" rightLabel="Подарки" />
                </div>
              </WorkspaceCard>
              <WorkspaceCard>
                <h2 className="text-xl font-extrabold text-[var(--text)]">Подсказки</h2>
                <Definition title="Повторные клиенты" text="Клиенты, у которых больше одной покупки за всё время." />
                <Definition title="Активные" text="Клиенты, у которых была операция в выбранном периоде." />
                <Definition title="Спящие" text="Клиенты с покупками, но без операций больше 30 дней." />
              </WorkspaceCard>
            </div>
          )}

          {tab === "clients" && (
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <ListCard title="Близко к подарку" empty="Пока нет клиентов в одном шаге от подарка.">
                {nearRewardClients.map((client) => <ListRow key={client.id} title={client.user.name} text={maskPhone(client.user.phone)} value={`${client.currentCount}/${program?.goalCount ?? 6}`} />)}
              </ListCard>
              <ListCard title="Спящие клиенты" empty="Спящих клиентов пока нет.">
                {sleepingClients.map((client) => <ListRow key={client.id} title={client.user.name} text={maskPhone(client.user.phone)} value={client.lastActionAt ? formatDateTime(client.lastActionAt) : "операций не было"} />)}
              </ListCard>
              <ListCard title="Топ клиентов" empty="Покупок пока нет.">
                {topClients.map((client) => <ListRow key={client.id} title={client.user.name} text={maskPhone(client.user.phone)} value={`${client.totalPurchases} покупок`} />)}
              </ListCard>
              <WorkspaceCard>
                <h2 className="text-xl font-extrabold text-[var(--text)]">Сводка</h2>
                <div className="mt-3 grid gap-3">
                  <MetricLine label="Активные" value={activeClients} />
                  <MetricLine label="Спящие" value={sleepingClients.length} />
                  <MetricLine label="Близко к подарку" value={nearRewardClients.length} />
                  <MetricLine label="Подарок доступен" value={rewardReadyClients} />
                </div>
              </WorkspaceCard>
            </div>
          )}

          {tab === "purchases" && (
            <ListCard title="Последние покупки" empty="Покупок в периоде нет." className="mt-5">
              {transactions.filter((transaction) => transaction.type === "PURCHASE").slice(0, 40).map((transaction) => (
                <ListRow key={transaction.id} title={transaction.membership.user.name} text={`Кассир: ${transaction.cashier.name} · ${formatDateTime(transaction.createdAt)}`} value={`+${transaction.quantity}`} />
              ))}
            </ListCard>
          )}

          {tab === "rewards" && (
            <ListCard title="История подарков" empty="Подарков в периоде нет." className="mt-5">
              {rewardClaims.map((claim) => (
                <ListRow key={claim.id} title={claim.user.name} text={`${claim.title ?? "Подарок не открыт"} · ${claim.redeemedBy ? `кассир: ${claim.redeemedBy.name}` : "ожидает выдачи"}`} value={formatDateTime(claim.redeemedAt ?? claim.openedAt ?? claim.createdAt)} />
              ))}
            </ListCard>
          )}

          {tab === "cashiers" && (
            <ListCard title="Кассиры за период" empty="Операций кассиров в периоде нет." className="mt-5">
              {cashierStats.map((cashier) => <ListRow key={cashier.cashierId} title={cashier.cashierName} text={`${cashier.purchases} покупок · ${cashier.rewards} подарков`} value={`${cashier.total} операций`} />)}
            </ListCard>
          )}

          {tab === "security" && (
            <ListCard title="Безопасность" empty="Подозрительных действий в периоде нет." className="mt-5">
              {suspiciousLogs.map((log) => <SuspiciousRow key={log.id} log={log} />)}
            </ListCard>
          )}
        </>
      )}
    </AdminShell>
  );
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function buildChartPoints(days: number, transactions: { type: LoyaltyTransactionType; quantity: number; createdAt: Date }[]) {
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

function buildCashierStats(transactions: { cashierId: string; cashier: { name: string }; type: LoyaltyTransactionType; quantity: number }[]) {
  return Array.from(
    transactions.reduce((map, transaction) => {
      if (transaction.type === "REWARD_OPENED") return map;
      const current = map.get(transaction.cashierId) ?? { cashierId: transaction.cashierId, cashierName: transaction.cashier.name, purchases: 0, rewards: 0, total: 0 };
      current.total += 1;
      if (transaction.type === "PURCHASE") current.purchases += transaction.quantity;
      if (transaction.type === "REWARD_REDEEMED" || transaction.type === "REWARD_GRANTED") current.rewards += 1;
      map.set(transaction.cashierId, current);
      return map;
    }, new Map<string, { cashierId: string; cashierName: string; purchases: number; rewards: number; total: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.total - a.total);
}

function Definition({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-3">
      <p className="font-bold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

function ListCard({ title, empty, children, className }: { title: string; empty: string; children: React.ReactNode; className?: string }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const emptyList = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <WorkspaceCard className={className}>
      <h2 className="text-xl font-extrabold text-[var(--text)]">{title}</h2>
      <div className="mt-3 divide-y divide-[var(--border)]">
        {emptyList ? <p className="py-3 text-sm text-[var(--text-muted)]">{empty}</p> : children}
      </div>
    </WorkspaceCard>
  );
}

function ListRow({ title, text, value }: { title: string; text: string; value: string }) {
  return (
    <div className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-bold text-[var(--text)]">{title}</p>
        <p className="mt-1 text-[var(--text-muted)]">{text}</p>
      </div>
      <p className="font-bold text-[var(--brand-strong)] sm:text-right">{value}</p>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white p-3">
      <span className="font-semibold text-[var(--text-muted)]">{label}</span>
      <span className="font-extrabold text-[var(--text)]">{value}</span>
    </div>
  );
}

function SuspiciousRow({ log }: { log: SuspiciousLog }) {
  const meta = parseSuspiciousMetadata(log.metadataJson);
  return (
    <div className="grid gap-2 py-3 text-sm lg:grid-cols-[1.2fr_1fr_auto]">
      <div>
        <p className="font-bold text-[var(--text)]">{meta.customerName || "Клиент не найден"}</p>
        <p className="text-[var(--text-muted)]">{meta.customerPhone ? maskPhone(meta.customerPhone) : "Телефон не указан"}</p>
      </div>
      <div className="text-[var(--text-muted)]">
        <p>Сотрудник: {log.actor?.name ?? "неизвестно"}</p>
        <p>Причина: {suspiciousReasonLabel(meta.reason)}</p>
        <p>Операция: {meta.operation === "reward" ? "выдача подарка" : "начисление покупки"}</p>
      </div>
      <p className="font-semibold text-[var(--text-muted)] lg:text-right">{formatDateTime(log.createdAt)}</p>
    </div>
  );
}

function suspiciousReasonLabel(reason?: string | null) {
  const labels: Record<string, string> = {
    repeat_purchase_guard: "повторное начисление",
    daily_purchase_limit: "превышение дневного лимита",
    cashier_self_operation: "операция по собственной карте",
  };

  return reason ? labels[reason] ?? reason : "не указана";
}

function parseSuspiciousMetadata(metadataJson: string | null) {
  if (!metadataJson) return {};

  try {
    return JSON.parse(metadataJson) as {
      customerName?: string | null;
      customerPhone?: string | null;
      operation?: string | null;
      reason?: string | null;
    };
  } catch {
    return {};
  }
}
