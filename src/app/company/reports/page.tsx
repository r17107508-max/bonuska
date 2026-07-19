import { type AuditLog, type User } from "@prisma/client";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

type SuspiciousLog = AuditLog & {
  actor: Pick<User, "id" | "name"> | null;
};

export default async function CompanyReportsPage() {
  const access = await requireCompanyAdmin();
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sleepingStart = new Date(now);
  sleepingStart.setDate(sleepingStart.getDate() - 30);
  const program = access.company.loyaltyProgram;
  const nearRewardStart = Math.max((program?.goalCount ?? 6) - 1, 1);

  const [
    clientsTotal,
    newClients7,
    newClientsMonth,
    purchasesTodayAggregate,
    purchasesWeekAggregate,
    purchasesMonthAggregate,
    rewardsMonth,
    repeatClients,
    sleepingClients,
    rewardReadyClients,
    nearRewardClients,
    topClients,
    topRewardClients,
    monthTransactions,
    weekTransactions,
    suspiciousCount,
    suspiciousLogs,
    rewardClaims,
  ] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, createdAt: { gte: weekStart } } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.aggregate({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: today } }, _sum: { quantity: true } }),
    getDb().loyaltyTransaction.aggregate({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: weekStart } }, _sum: { quantity: true } }),
    getDb().loyaltyTransaction.aggregate({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: monthStart } }, _sum: { quantity: true } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: { in: ["REWARD_REDEEMED", "REWARD_GRANTED"] }, createdAt: { gte: monthStart } } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 1 } } }),
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
    getDb().customerMembership.count({ where: { companyId: access.companyId, rewardAvailable: true } }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId, rewardAvailable: false, currentCount: { gte: nearRewardStart } },
      include: { user: true },
      orderBy: { currentCount: "desc" },
      take: 10,
    }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId },
      include: { user: true },
      orderBy: { totalPurchases: "desc" },
      take: 10,
    }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId, totalRewards: { gt: 0 } },
      include: { user: true },
      orderBy: { totalRewards: "desc" },
      take: 10,
    }),
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId, type: { in: ["PURCHASE", "REWARD_OPENED", "REWARD_REDEEMED", "REWARD_GRANTED"] }, createdAt: { gte: monthStart } },
      include: { cashier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId, createdAt: { gte: weekStart } },
      select: { membershipId: true },
    }),
    getDb().auditLog.count({ where: { companyId: access.companyId, action: "SUSPICIOUS_REPEAT_PURCHASE" } }),
    getDb().auditLog.findMany({
      where: { companyId: access.companyId, action: "SUSPICIOUS_REPEAT_PURCHASE" },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getDb().rewardClaim.findMany({
      where: { companyId: access.companyId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        redeemedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);
  const purchasesToday = purchasesTodayAggregate._sum.quantity ?? 0;
  const purchasesWeek = purchasesWeekAggregate._sum.quantity ?? 0;
  const purchasesMonth = purchasesMonthAggregate._sum.quantity ?? 0;
  const activeClients7 = new Set(weekTransactions.map((transaction) => transaction.membershipId)).size;
  const repeatRate = clientsTotal > 0 ? Math.round((repeatClients / clientsTotal) * 100) : 0;
  const cashierStats = Array.from(
    monthTransactions.reduce((map, transaction) => {
      if (transaction.type === "REWARD_OPENED") {
        return map;
      }

      const current = map.get(transaction.cashierId) ?? {
        cashierId: transaction.cashierId,
        cashierName: transaction.cashier.name,
        purchases: 0,
        rewards: 0,
        total: 0,
      };
      current.total += transaction.type === "PURCHASE" ? transaction.quantity : 1;
      if (transaction.type === "PURCHASE") {
        current.purchases += transaction.quantity;
      }
      if (transaction.type === "REWARD_REDEEMED" || transaction.type === "REWARD_GRANTED") {
        current.rewards += 1;
      }
      map.set(transaction.cashierId, current);
      return map;
    }, new Map<string, { cashierId: string; cashierName: string; purchases: number; rewards: number; total: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.total - a.total);
  return (
    <AdminShell title="Отчёты" subtitle="Клиенты, покупки, подарки, кассиры и подозрительные операции." nav={companyNav}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Клиентов всего" value={clientsTotal} />
        <Metric label="Новых за 7 дней" value={newClients7} />
        <Metric label="Новых за месяц" value={newClientsMonth} />
        <Metric label="Активных за 7 дней" value={activeClients7} />
        <Metric label="Повторных клиентов" value={`${repeatRate}%`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Покупок сегодня" value={purchasesToday} />
        <Metric label="Покупок за 7 дней" value={purchasesWeek} />
        <Metric label="Покупок за месяц" value={purchasesMonth} />
        <Metric label="Подарков за месяц" value={rewardsMonth} />
        <Metric label="Подарок доступен" value={rewardReadyClients} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Подозрительных попыток" value={suspiciousCount} />
        <Metric label="Клиентов близко к подарку" value={nearRewardClients.length} />
        <Metric label="Спящих клиентов" value={sleepingClients.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-xl font-semibold text-slate-950">Повторные клиенты</h2>
          <p className="mt-2 text-sm text-slate-600">
            {repeatClients} из {clientsTotal} клиентов сделали больше одной покупки. Это главный показатель, что акция возвращает людей.
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${repeatRate}%` }} />
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-xl font-semibold text-slate-950">Спящие клиенты</h2>
          <p className="mt-2 text-sm text-slate-600">Клиенты с покупками, у которых не было операций больше 30 дней.</p>
          <div className="mt-4 divide-y divide-slate-200">
            {sleepingClients.map((client) => (
              <div key={client.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{client.user.name}</p>
                  <p className="text-slate-500">{client.user.phone}</p>
                </div>
                <p className="text-slate-600 sm:text-right">{client.lastActionAt ? formatDateTime(client.lastActionAt) : "операций не было"}</p>
              </div>
            ))}
            {sleepingClients.length === 0 && <p className="py-3 text-sm text-slate-500">Спящих клиентов пока нет.</p>}
          </div>
        </section>
      </div>

      <section className="panel mt-6 p-5">
        <h2 className="text-xl font-semibold text-slate-950">История подарков</h2>
        <p className="mt-2 text-sm text-slate-600">
          Здесь видно, какой подарок выпал клиенту, когда он был открыт и кто подтвердил выдачу.
        </p>
        <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {rewardClaims.map((claim) => (
            <div key={claim.id} className="grid gap-3 p-4 text-sm lg:grid-cols-[1.1fr_1fr_1fr_1fr]">
              <div>
                <p className="font-semibold text-slate-950">{rewardClaimTimelineText(claim.user.name, claim.status, claim.title)}</p>
                <p className="text-slate-500">{claim.user.phone}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">{claim.title ?? "Подарок не открыт"}</p>
                {claim.description && <p className="mt-1 text-slate-500">{claim.description}</p>}
              </div>
              <div className="text-slate-600">
                <p>Открыт: {formatDateTime(claim.openedAt)}</p>
                <p>Выдан: {formatDateTime(claim.redeemedAt)}</p>
              </div>
              <div className="text-slate-600 lg:text-right">
                <p className="font-semibold">{rewardClaimStatusLabel(claim.status)}</p>
                {claim.redeemedBy && <p className="mt-1">Кассир: {claim.redeemedBy.name}</p>}
              </div>
            </div>
          ))}
          {rewardClaims.length === 0 && <p className="p-4 text-sm text-slate-500">Открытых подарков пока нет.</p>}
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Подозрительные операции</h2>
        <p className="mt-2 text-sm text-slate-600">
          Здесь появляются повторные начисления, превышение дневного лимита и попытки кассира провести собственную карту.
        </p>
        <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {suspiciousLogs.map((log) => (
            <SuspiciousRow key={log.id} log={log} />
          ))}
          {suspiciousLogs.length === 0 && <p className="p-4 text-sm text-slate-500">Подозрительных операций пока нет.</p>}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-xl font-semibold text-slate-950">Клиенты близко к подарку</h2>
          <div className="mt-4 divide-y divide-slate-200">
            {nearRewardClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-semibold">{client.user.name}</span>
                  <span className="ml-2 text-sm text-slate-500">{client.user.phone}</span>
                </span>
                <span className="font-semibold text-[var(--brand)]">{client.currentCount}/{program?.goalCount ?? 6}</span>
              </div>
            ))}
            {nearRewardClients.length === 0 && <p className="py-3 text-sm text-slate-500">Пока нет клиентов в шаге от подарка.</p>}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-xl font-semibold text-slate-950">Кассиры за месяц</h2>
          <div className="mt-4 divide-y divide-slate-200">
            {cashierStats.map((cashier) => (
              <div key={cashier.cashierId} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto]">
                <p className="font-semibold text-slate-950">{cashier.cashierName}</p>
                <p className="text-slate-600 sm:text-right">
                  {cashier.purchases} покупок · {cashier.rewards} подарков
                </p>
              </div>
            ))}
            {cashierStats.length === 0 && <p className="py-3 text-sm text-slate-500">Операций кассиров за месяц пока нет.</p>}
          </div>
        </section>
      </div>

      <section className="panel mt-6 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Топ клиентов</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-800">По покупкам</h3>
            <div className="mt-2 divide-y divide-slate-200">
              {topClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-semibold">{client.user.name}</span>
                  <span className="ml-2 text-sm text-slate-500">{client.user.phone}</span>
                </span>
                  <span className="font-semibold text-[var(--brand)]">{client.totalPurchases}</span>
                </div>
              ))}
              {topClients.length === 0 && <p className="py-3 text-sm text-slate-500">Покупок пока нет.</p>}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">По подаркам</h3>
            <div className="mt-2 divide-y divide-slate-200">
              {topRewardClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="font-semibold">{client.user.name}</span>
                    <span className="ml-2 text-sm text-slate-500">{client.user.phone}</span>
                  </span>
                  <span className="font-semibold text-[var(--brand)]">{client.totalRewards}</span>
                </div>
              ))}
              {topRewardClients.length === 0 && <p className="py-3 text-sm text-slate-500">Выданных подарков пока нет.</p>}
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function SuspiciousRow({ log }: { log: SuspiciousLog }) {
  const meta = parseSuspiciousMetadata(log.metadataJson);

  return (
    <div className="grid gap-2 p-4 text-sm lg:grid-cols-[1.2fr_1fr_1fr]">
      <div>
        <p className="font-semibold text-slate-950">{meta.customerName || "Клиент не найден"}</p>
        <p className="text-slate-500">{meta.customerPhone || "Телефон не указан"}</p>
      </div>
      <div>
        <p className="font-medium text-slate-700">Кассир: {log.actor?.name ?? "неизвестно"}</p>
        <p className="text-slate-500">Источник: {meta.source === "api" ? "API" : "сканер"}</p>
        <p className="text-slate-500">Причина: {suspiciousReasonLabel(meta.reason)}</p>
        <p className="text-slate-500">Операция: {meta.operation === "reward" ? "выдача подарка" : "начисление покупки"}</p>
      </div>
      <p className="text-slate-500 lg:text-right">{formatDateTime(log.createdAt)}</p>
    </div>
  );
}

function suspiciousReasonLabel(reason?: string | null) {
  const labels: Record<string, string> = {
    repeat_purchase_guard: "повтор раньше защитной паузы",
    daily_purchase_limit: "дневной лимит клиента",
    cashier_self_operation: "операция по собственной карте кассира",
  };

  return reason ? labels[reason] ?? reason : "не указана";
}

function parseSuspiciousMetadata(metadataJson: string | null) {
  if (!metadataJson) {
    return {};
  }

  try {
    return JSON.parse(metadataJson) as {
      customerName?: string | null;
      customerPhone?: string | null;
      source?: string | null;
      operation?: string | null;
      reason?: string | null;
    };
  } catch {
    return {};
  }
}

function rewardClaimStatusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Доступен, не открыт",
    OPENED: "Открыт клиентом",
    REDEEMED: "Выдан",
    EXPIRED: "Истек",
    CANCELLED: "Отменен",
  };

  return labels[status] ?? status;
}

function rewardClaimTimelineText(customerName: string, status: string, title: string | null) {
  const giftTitle = title ?? "подарок не открыт";

  if (status === "REDEEMED") {
    return `${customerName} — подарок выдан: ${giftTitle}`;
  }

  if (status === "OPENED") {
    return `${customerName} — открыла подарок: ${giftTitle}`;
  }

  return `${customerName} — накопила подарок`;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
