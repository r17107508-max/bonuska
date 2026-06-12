import type { AuditLog, User } from "@prisma/client";
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
  const program = access.company.loyaltyProgram;
  const nearRewardStart = Math.max((program?.goalCount ?? 6) - 1, 1);

  const [
    clientsTotal,
    newClients7,
    newClientsMonth,
    purchasesToday,
    purchasesWeek,
    purchasesMonth,
    rewardsMonth,
    repeatClients,
    rewardReadyClients,
    nearRewardClients,
    topClients,
    monthTransactions,
    weekTransactions,
    suspiciousCount,
    suspiciousLogs,
  ] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, createdAt: { gte: weekStart } } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: weekStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "REWARD_GRANTED", createdAt: { gte: monthStart } } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 1 } } }),
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
    getDb().loyaltyTransaction.findMany({
      where: { companyId: access.companyId, createdAt: { gte: monthStart } },
      include: { cashier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
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
  ]);
  const activeClients7 = new Set(weekTransactions.map((transaction) => transaction.membershipId)).size;
  const cashierStats = Array.from(
    monthTransactions.reduce((map, transaction) => {
      const current = map.get(transaction.cashierId) ?? {
        cashierId: transaction.cashierId,
        cashierName: transaction.cashier.name,
        purchases: 0,
        rewards: 0,
        total: 0,
      };
      current.total += 1;
      if (transaction.type === "PURCHASE") {
        current.purchases += 1;
      }
      if (transaction.type === "REWARD_GRANTED") {
        current.rewards += 1;
      }
      map.set(transaction.cashierId, current);
      return map;
    }, new Map<string, { cashierId: string; cashierName: string; purchases: number; rewards: number; total: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.total - a.total);

  return (
    <AdminShell title="Отчеты" subtitle="Клиенты, покупки, подарки, кассиры и подозрительные операции." nav={companyNav}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Клиентов всего" value={clientsTotal} />
        <Metric label="Новых за 7 дней" value={newClients7} />
        <Metric label="Новых за месяц" value={newClientsMonth} />
        <Metric label="Активных за 7 дней" value={activeClients7} />
        <Metric label="Повторных клиентов" value={repeatClients} />
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
      </div>

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
                <span className="font-semibold text-amber-700">{client.currentCount}/{program?.goalCount ?? 6}</span>
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
        <div className="mt-4 divide-y divide-slate-200">
          {topClients.map((client) => (
            <div key={client.id} className="flex items-center justify-between py-3">
              <span>
                <span className="font-semibold">{client.user.name}</span>
                <span className="ml-2 text-sm text-slate-500">{client.user.phone}</span>
              </span>
              <span className="font-semibold text-teal-700">{client.totalPurchases}</span>
            </div>
          ))}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
