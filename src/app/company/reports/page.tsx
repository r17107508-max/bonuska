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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [purchasesToday, purchasesMonth, rewards, activeClients, topClients, suspiciousCount, suspiciousLogs] = await Promise.all([
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "REWARD_GRANTED" } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 0 } } }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId },
      include: { user: true },
      orderBy: { totalPurchases: "desc" },
      take: 10,
    }),
    getDb().auditLog.count({ where: { companyId: access.companyId, action: "SUSPICIOUS_REPEAT_PURCHASE" } }),
    getDb().auditLog.findMany({
      where: { companyId: access.companyId, action: "SUSPICIOUS_REPEAT_PURCHASE" },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <AdminShell title="Отчеты" subtitle="Базовая статистика покупок, подарков и активных клиентов." nav={companyNav}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Покупок сегодня" value={purchasesToday} />
        <Metric label="Покупок за месяц" value={purchasesMonth} />
        <Metric label="Выдано подарков" value={rewards} />
        <Metric label="Активных клиентов" value={activeClients} />
        <Metric label="Подозрительных попыток" value={suspiciousCount} />
      </div>

      <section className="panel mt-6 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Подозрительные операции</h2>
        <p className="mt-2 text-sm text-slate-600">
          Здесь появляются попытки повторно начислить покупку одному клиенту раньше, чем закончится защитная пауза.
        </p>
        <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {suspiciousLogs.map((log) => (
            <SuspiciousRow key={log.id} log={log} />
          ))}
          {suspiciousLogs.length === 0 && <p className="p-4 text-sm text-slate-500">Подозрительных операций пока нет.</p>}
        </div>
      </section>

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
      </div>
      <p className="text-slate-500 lg:text-right">{formatDateTime(log.createdAt)}</p>
    </div>
  );
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
